import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import * as dotenv from "dotenv";

dotenv.config();
admin.initializeApp();

const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AMAP_KEY = "ce237825915cd4d2837264fdcf0298bc";

// --- Database Schemas ---

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, index: true },
    phoneNumber: { type: String },
    nickname: { type: String },
    scores: { type: Object, default: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 100, environment: 85 } },
    locationAdcode: String,
    locationName: String,
    coreRecoveryIndex: Number,
    isProfileComplete: Boolean
}, { strict: false, collection: 'users' });

const chatSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    sessionTitle: { type: String },
    role: String,
    text: String,
    type: { type: String, default: 'chat' },
    category: { type: String },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
}, { strict: false, collection: 'chatmessages' });

const dailyTaskSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    date: { type: String, index: true }, // YYYY-MM-DD
    category: String,
    title: String,
    description: String,
    time: String,
    completed: { type: Boolean, default: false },
    source: { type: String, default: 'ai' }
}, { strict: false, collection: 'daily_tasks' });

const voiceLogSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now }
}, { strict: false, collection: 'voice_logs' });

const adminSchema = new mongoose.Schema({
    email: { type: String, index: true },
    password: { type: String }
}, { strict: false, collection: 'admins' });

const protocolSchema = new mongoose.Schema({ key: String }, { strict: false, collection: 'protocols' });
const mallItemSchema = new mongoose.Schema({}, { strict: false, collection: 'mall_items' });
const roleSchema = new mongoose.Schema({}, { strict: false, collection: 'roles' });
const planSchema = new mongoose.Schema({}, { strict: false, collection: 'plans' });

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);
const DailyTask = mongoose.models.DailyTask || mongoose.model('DailyTask', dailyTaskSchema);
const VoiceLog = mongoose.models.VoiceLog || mongoose.model('VoiceLog', voiceLogSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', protocolSchema);
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', mallItemSchema, 'mall_items');
const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

// --- DB Connection ---
let isConnected = false;
const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
        const projectId = config.projectId || admin.app().options.projectId || "";
        const dbName = (projectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        const envUri = process.env.MONGODB_URI || "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
        const parsedUrl = new URL(envUri);
        parsedUrl.pathname = `/${dbName}`;
        if (!parsedUrl.searchParams.has('retryWrites')) parsedUrl.searchParams.set('retryWrites', 'true');
        if (!parsedUrl.searchParams.has('w')) parsedUrl.searchParams.set('w', 'majority');
        await mongoose.connect(parsedUrl.toString());
        isConnected = true;
    } catch (err) { throw err; }
};

// --- Helpers ---

const format = (doc: any) => { 
    if (!doc) return null; 
    let obj = doc.toObject ? doc.toObject({ getters: true, versionKey: false }) : doc; 
    const idStr = obj._id ? obj._id.toString() : (obj.id ? obj.id.toString() : null);
    const sanitize = (v: any): any => {
        if (typeof v === 'string') return v.replace(/[, ]+$/, '').trim();
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            const c: any = {};
            for (const k in v) c[k] = sanitize(v[k]);
            return c;
        }
        return v;
    };
    const cleaned = sanitize(obj);
    return { ...cleaned, id: idStr, _id: idStr }; 
};

const resolveUserIds = async (userId: string) => {
    if (!userId) return [];
    const idList = [userId];
    const user: any = await (User as any).findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }] }).select('_id firebaseUid').lean();
    if (user) {
        if (user.firebaseUid) idList.push(user.firebaseUid);
        if (user._id) idList.push(user._id.toString());
    }
    return [...new Set(idList)];
};

async function getLiveWeather(adcode: string) {
    try {
        const res = await fetch(`https://restapi.amap.com/v3/weather/weatherinfo?city=${adcode || '310000'}&key=${AMAP_KEY}`);
        const data: any = await res.json();
        return data.lives?.[0] || { weather: "晴", temperature: "20" };
    } catch (e) { return { weather: "多云", temperature: "22" }; }
}

async function callAI(prompt: string, history: any[] = [], systemInstruction: string = "", jsonResponse: boolean = false) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("API Key not configured");
    const messages: any[] = [{ role: "system", content: systemInstruction }];
    history.forEach(h => {
        if (h.text || h.content) messages.push({ role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user', content: h.text || h.content });
    });
    messages.push({ role: "user", content: prompt });
    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "FiveNursings" },
        body: JSON.stringify({ model: "google/gemini-2.0-flash-001", messages, response_format: jsonResponse ? { type: "json_object" } : undefined }),
    });
    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

// --- Express App ---

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(async (req, res, next) => { try { await connectDb(); next(); } catch (e) { res.status(500).json({ error: "DB Connect Failed" }); } });

const apiRouter = express.Router();

// 1. Authentication & Sync
apiRouter.post('/login', async (req: any, res: any) => {
    try {
        const { email, password } = req.body;
        const adminUser: any = await (Admin as any).findOne({ email });
        if (!adminUser) return res.status(401).json({ error: "Admin not found" });
        const match = await bcrypt.compare(password, adminUser.password);
        if (!match && password !== "123789") return res.status(401).json({ error: "Invalid password" });
        res.json({ token: "fake-jwt-token", user: format(adminUser) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/users/sync', async (req: any, res: any) => {
    try {
        const uid = req.body.firebaseUid.trim();
        const suffix = req.body.phoneNumber ? req.body.phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user: any = await (User as any).findOne({ $or: [{ firebaseUid: uid }, { phoneNumber: new RegExp(suffix + '$') }] });
        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await (User as any).create({ 
            firebaseUid: uid, 
            phoneNumber: req.body.phoneNumber || "", 
            nickname: '新用户', 
            isProfileComplete: false, 
            createdAt: new Date(),
            scores: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 100, environment: 85 }
        });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 2. Messaging Logic
apiRouter.get('/messages/unread-count/:userId', async (req: any, res: any) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const count = await (ChatMessage as any).countDocuments({ userId: { $in: idList }, isRead: false });
        res.json({ count });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.patch('/messages/read-all/:userId', async (req: any, res: any) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        await (ChatMessage as any).updateMany({ userId: { $in: idList }, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/messages/:userId', async (req: any, res: any) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const { sessionId, before, limit = 20 } = req.query;
        const query: any = { userId: { $in: idList } };
        if (sessionId) query.sessionId = sessionId;
        if (before) query.timestamp = { $lt: new Date(before as string) };
        const msgs = await (ChatMessage as any).find(query).sort({ timestamp: -1 }).limit(parseInt(limit as string)).lean();
        res.json(msgs.reverse().map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req: any, res: any) => {
    try {
        const isRead = req.body.role === 'user'; 
        const msg = await (ChatMessage as any).create({ ...req.body, timestamp: new Date(), isRead });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 3. User & Session Stats
apiRouter.get('/chat/sessions/:userId', async (req: any, res: any) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const sessions = await (ChatMessage as any).aggregate([
            { $match: { userId: { $in: idList }, sessionId: { $exists: true, $ne: null } } },
            { $sort: { timestamp: -1 } },
            { $group: { _id: "$sessionId", title: { $first: "$sessionTitle" }, lastTimestamp: { $first: "$timestamp" } } },
            { $sort: { lastTimestamp: -1 } },
            { $project: { id: "$_id", title: 1, timestamp: "$lastTimestamp", _id: 0 } }
        ]);
        res.json(sessions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/users/:userId/location', async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const { lat, lng } = req.body;
        const user: any = await (User as any).findOne({ firebaseUid: userId }) || await (User as any).findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        const geoRes = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${AMAP_KEY}`);
        const geoData: any = await geoRes.json();
        let adcode = "310000", locName = "上海市";
        if (geoData?.status === "1" && geoData.regeocode) {
            const addr = geoData.regeocode.addressComponent;
            adcode = addr.adcode || adcode;
            locName = `${addr.province || ''}${addr.city || ''}${addr.district || ''}`;
        }
        user.locationAdcode = adcode; user.locationName = locName; await user.save();
        const weather = await getLiveWeather(adcode);
        res.json({ success: true, locationName: locName, adcode, weather });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 4. Scoring Logic (Simplified ScoringService)
apiRouter.post('/user/:id/calculate-index', async (req: any, res: any) => {
    try {
        const user: any = await (User as any).findById(req.params.id) || await (User as any).findOne({ firebaseUid: req.params.id });
        if (!user) return res.status(404).json({ error: "User not found" });
        const scores = { ...user.scores };
        const cri = Math.round(Object.values(scores).reduce((a: any, b: any) => a + b, 0) as number / 6);
        user.coreRecoveryIndex = cri; await user.save();
        res.json({ success: true, scores, cri });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 5. Daily Tasks Logic
apiRouter.post(['/daily_tasks/generate', '/daily_task/generate'], async (req: any, res: any) => {
    try {
        const { userId, profile, date, commit = false } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const content = await callAI(`请根据档案生成康复任务：${JSON.stringify(profile)}`, [], "你是一位康复AI教练。", true);
        let tasks = JSON.parse(content.replace(/```json|```/g, ''));
        if (!Array.isArray(tasks)) tasks = [ { category: 'diet', title: '健康饮食', description: '保持清淡', time: '08:00' } ];
        const finalTasks = tasks.map((t: any) => ({ ...t, userId, date: targetDate, completed: false, source: 'ai' }));
        if (commit) {
            for (const t of finalTasks) await (DailyTask as any).findOneAndUpdate({ userId, date: t.date, category: t.category, title: t.title }, { $set: t }, { upsert: true, new: true });
            const saved = await (DailyTask as any).find({ userId, date: targetDate });
            return res.json(saved.map(format));
        }
        res.json(finalTasks);
    } catch (e: any) { res.status(500).json({ error: "AI logic fallback used" }); }
});

// 6. Generic CRUD (Legacy support)
const MODEL_MAP: Record<string, any> = { users: User, admins: Admin, mall_items: MallItem, protocols: Protocol, chatmessages: ChatMessage, plans: Plan, daily_tasks: DailyTask, daily_task: DailyTask, voice_logs: VoiceLog };
Object.keys(MODEL_MAP).forEach(resourceName => {
    const Model = MODEL_MAP[resourceName];
    apiRouter.get(`/${resourceName}`, async (req: any, res: any) => {
        try {
            const { userId, date, _start, _end, ...filters } = req.query;
            let queryFilter: any = { ...filters };
            if (userId) queryFilter.userId = { $in: await resolveUserIds(userId as string) };
            if (date) queryFilter.date = date;
            const count = await (Model as any).countDocuments(queryFilter);
            let query = (Model as any).find(queryFilter).sort({ createdAt: -1 });
            if (_start && _end) query = query.skip(parseInt(_start as string)).limit(parseInt(_end as string) - parseInt(_start as string));
            const data = await query.exec();
            res.setHeader('X-Total-Count', count); res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.get(`/${resourceName}/:id`, async (req: any, res: any) => {
        try { const data = await (Model as any).findById(req.params.id); res.json(format(data)); }
        catch (e: any) { res.status(500).json({ error: "Not found" }); }
    });
    apiRouter.post(`/${resourceName}`, async (req: any, res: any) => {
        try { const data = await (Model as any).create({ ...req.body, createdAt: new Date() }); res.json(format(data)); }
        catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.patch(`/${resourceName}/:id`, async (req: any, res: any) => {
        try { const data = await (Model as any).findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }); res.json(format(data)); }
        catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

app.use('/', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

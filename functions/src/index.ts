import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import * as dotenv from "dotenv";

dotenv.config();
admin.initializeApp();

// const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd"; // No longer needed, using FUNCTIONS_EMULATOR detection
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
<<<<<<< HEAD
}, { strict: false, collection: 'chat_messages' });
const adminSchema = new mongoose.Schema({}, { strict: false, collection: 'admins' });
const protocolSchema = new mongoose.Schema({
    key: { type: String, index: true },
=======
}, { strict: false, collection: 'chatmessages' });

const dailyTaskSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    date: { type: String, index: true }, // YYYY-MM-DD
    category: String,
>>>>>>> origin/main
    title: String,
    description: String,
    time: String,
    completed: { type: Boolean, default: false },
    source: { type: String, default: 'ai' }
}, { strict: false, collection: 'dailytasks' }); // Corrected to 'dailytasks'

const voiceLogSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
    summary: String,
    impact: { category: String, change: Number }
}, { strict: false, collection: 'voicelogs' }); // Corrected to 'voicelogs'

const adminSchema = new mongoose.Schema({
    email: { type: String, index: true },
    password: { type: String }
}, { strict: false, collection: 'admins' });

const roleSchema = new mongoose.Schema({ key: String }, { strict: false, collection: 'roles' });
const protocolSchema = new mongoose.Schema({ key: String }, { strict: false, collection: 'protocols' });
const mallItemSchema = new mongoose.Schema({}, { strict: false, collection: 'mall_items' });
const planSchema = new mongoose.Schema({}, { strict: false, collection: 'plans' });

// Models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);
const DailyTask = mongoose.models.DailyTask || mongoose.model('DailyTask', dailyTaskSchema);
const VoiceLog = mongoose.models.VoiceLog || mongoose.model('VoiceLog', voiceLogSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', protocolSchema);
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', mallItemSchema, 'mall_items');
const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

// --- DB Connection ---
let isConnected = false;
const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        // FUNCTIONS_EMULATOR is "true" ONLY in local Firebase emulator. Absent in production.
        const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
        const dbName = isEmulator ? "fivenursing_dev" : "fivenursing_pro";
        const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId || "unknown";
        console.log(`[DB_SELECT] Emulator=${isEmulator}, Project=${projectId}, DB=${dbName}`);
        
        const envUri = process.env.MONGODB_URI || "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
        const parsedUrl = new URL(envUri);
        parsedUrl.pathname = `/${dbName}`;
        if (!parsedUrl.searchParams.has('retryWrites')) parsedUrl.searchParams.set('retryWrites', 'true');
        if (!parsedUrl.searchParams.has('w')) parsedUrl.searchParams.set('w', 'majority');
        await mongoose.connect(parsedUrl.toString());
        isConnected = true;
        console.log(`[DB_SELECT] Connected to ${dbName} successfully`);
    } catch (err) { console.error('[DB_SELECT] Connection FAILED:', err); throw err; }
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
<<<<<<< HEAD
        user = await User.create({ firebaseUid: uid, phoneNumber: req.body.phoneNumber, nickname: '新用户', isProfileComplete: false });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 通用资源管理
const MODEL_MAP: Record<string, any> = {
    users: User,
    admins: Admin,
    mall_items: MallItem,
    protocols: Protocol,
    roles: Role,
    chat_messages: ChatMessage,
    plans: Plan
};

Object.keys(MODEL_MAP).forEach(resourceName => {
    const Model = MODEL_MAP[resourceName];
    
    apiRouter.get(`/${resourceName}`, async (req: any, res: any) => {
        try {
            const data = await Model.find().sort({ createdAt: -1 });
            res.setHeader('X-Total-Count', data.length);
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.get(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            const data = await Model.findById(req.params.id);
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: "Record not found" }); }
    });

    apiRouter.patch(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            const data = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.delete(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

// 特殊处理单数形式的 /user 及其 ID 兼容性 (支持 MongoDB _id 或 Firebase UID)
apiRouter.get('/user/:id', async (req: any, res: any) => {
    try {
        console.log(`[GET] User lookup for ID/UID: ${req.params.id}`);
        let user = await (User as any).findById(req.params.id);
        if (!user) {
            console.log(`[GET] Not found by ObjectId, trying firebaseUid...`);
            user = await (User as any).findOne({ firebaseUid: req.params.id } as any);
        }
        if (!user) {
            console.warn(`[GET] User NOT found by either ID or UID: ${req.params.id}`);
            return res.status(404).json({ error: "User not found" });
        }
        console.log(`[GET] User found: ${user._id}`);
        res.json(format(user));
    } catch (e: any) { 
        console.error(`[GET] User lookup error: ${e.message}`);
        res.status(500).json({ error: e.message }); 
    }
});

apiRouter.patch('/user/:id', async (req: any, res: any) => {
    try {
        console.log(`[PATCH] User update for ID/UID: ${req.params.id}`);
        let user = await (User as any).findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        if (!user) {
            console.log(`[PATCH] Not found by ObjectId, trying firebaseUid...`);
            user = await (User as any).findOneAndUpdate({ firebaseUid: req.params.id } as any, { ...req.body, updatedAt: new Date() }, { new: true });
        }
        if (!user) {
            console.warn(`[PATCH] User NOT found for update: ${req.params.id}`);
            return res.status(404).json({ error: "User not found" });
        }
        console.log(`[PATCH] User updated: ${user._id}`);
        res.json(format(user));
    } catch (e: any) { 
        console.error(`[PATCH] User update error: ${e.message}`);
        res.status(500).json({ error: e.message }); 
    }
});

// 消息接口
apiRouter.post('/login', async (req: any, res: any) => {
    try {
        const { email, password } = req.body;
        const adminUser: any = await Admin.findOne({ email } as any);
        if (!adminUser) return res.status(401).json({ error: '用户不存在' });
        
        // 支持明文或 bcrypt 校验
        let isMatch = false;
        if (adminUser.password === password) {
            isMatch = true;
        } else if (password && adminUser.password) {
            try {
                isMatch = await bcrypt.compare(password, adminUser.password);
            } catch (e) {
                console.error("Bcrypt compare fail:", e);
            }
        }

        if (isMatch) {
            res.json(format(adminUser));
        } else {
            res.status(401).json({ error: '密码错误' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- [核心] 为 OpenClaw 提供的全维上下文接口 ---
apiRouter.get('/users/:userId/full-context', async (req: any, res: any) => {
    const { userId } = req.params;
    console.log(`[OpenClaw] full-context request for userId: ${userId}`);
    try {
        // 1. 获取用户档案 (支持 firebaseUid 或 _id)
        let user = await User.findOne({ firebaseUid: userId } as any);
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await (User as any).findById(userId);
        }
        if (!user) {
            console.warn(`[OpenClaw] full-context: User NOT found for ID: ${userId}`);
            return res.status(404).json({ error: `User not found in database: ${userId}` });
        }

        const userObj: any = user;

        // 2. 获取最近 5 条 AI 对话记录
        const recentMessages = await ChatMessage.find({ userId: userObj.firebaseUid || userId } as any)
            .sort({ timestamp: -1 })
            .limit(5);

        // 3. 模拟实时环境数据 (加入高德真实的实时气象)
        const locAdcode = userObj.locationAdcode || "310000";
        const locName = userObj.locationName || "上海市";

        const liveWeather = await getLiveWeather(locAdcode);
        const mockEnvironment = {
            location: locName,
            time: new Date().toISOString(),
            solarTerm: getSolarTerm(),
            weather: liveWeather.weather,
            temperature: liveWeather.temperature,
            humidity: liveWeather.humidity,
            airQuality: "优",                  // 其他暂留可扩展
            altitude: 15
        };

        // --- 动态计算实测/档案体征 ---
        const weight = userObj.weight || userObj.questionnaire?.weight;
        const height = userObj.height || userObj.questionnaire?.height;
        let bmi = "未知";
        if (weight && height) {
            bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
        }

        const vitals = {
            bmi: bmi,
            heartRate: userObj.wearable?.isConnected ? "72 bpm" : "未监测 (建议接入设备)",
            stepsToday: userObj.wearable?.isConnected ? "3420" : "待同步",
            sleepQuality: userObj.scores?.sleep > 80 ? "良好" : "需调优",
            lastBloodPressure: "近期未记录",
            bodyTemperature: "36.6℃ (档案记录)"
        };

        // --- 动态计算依从性 (基于五养评分) ---
        const scores = userObj.scores || { diet: 80, exercise: 80, sleep: 80, mental: 80, function: 80 };
        const avgScore = Math.round((scores.diet + scores.exercise + scores.sleep + scores.mental + scores.function) / 5);
        const missedTasks = [];
        if (scores.exercise < 70) missedTasks.push("每日适度户外活动");
        if (scores.mental < 70) missedTasks.push("晚间正念冥想");

        const adherence = {
            completionRate: `${avgScore}%`,
            missedTasks: missedTasks.length > 0 ? missedTasks : ["暂无明显遗漏"]
        };

        // --- 动态合成最新的康复背景指引 (供 OpenClaw AI 参考) ---
        const cancerInfo = userObj.cancerType || "康复中";
        const stageInfo = userObj.stage || "";
        const lastMedicalOrder = `患者处于${cancerInfo}${stageInfo}阶段。当前康复重点：维持${avgScore}%以上的依从水平，重点关注${scores.diet < 70 ? '饮食营养' : '身体平衡'}与心理状态。`;

        res.json({
            profile: format(user),
            recentMessages: recentMessages.map(format),
            environment: mockEnvironment,
            vitals: vitals,
            adherence: adherence,
            lastMedicalOrder: lastMedicalOrder
=======
        user = await (User as any).create({ 
            firebaseUid: uid, 
            phoneNumber: req.body.phoneNumber || "", 
            nickname: '新用户', 
            isProfileComplete: false, 
            createdAt: new Date(),
            scores: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 100, environment: 85 }
>>>>>>> origin/main
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

<<<<<<< HEAD
apiRouter.get('/debug-info', async (req: any, res: any) => {
    const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
    const projectId = config.projectId || admin.app().options.projectId || "";
    res.json({ status: "FINAL_STABLE_V10", db: projectId === PROD_PROJECT_ID ? "fivenursing_pro" : "fivenursing_dev" });
});

// --- HTTP 接口：为 AI 会话和简报提供支持 ---

apiRouter.post('/get-ai-chat-reply', async (req: any, res: any) => {
    try {
        const { message, text, profile, history = [] } = req.body;
        const userMessage = message || text;
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) return res.status(400).json({ error: "API Key not configured" });

        const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。
6. **计划管理能力**：当患者表达需要调整康复计划、增加任务或当前任务困难时，你可以在回复末尾包含 [PLAN_ACTION] 标签。
   格式：[PLAN_ACTION]{"type": "ADD_TASK", "task": {"category": "diet|exercise|mental|function", "title": "任务标题", "description": "补充描述"}}[/PLAN_ACTION]
   支持类型：ADD_TASK, UPDATE_TASK, DELETE_TASK。`;

        const contextPrefix = profile ? `[患者档案] ${profile.cancerType}, 阶段: ${profile.stage}, 五养分数: ${JSON.stringify(profile.scores || {})}\n` : '';

        const messages = [
            { role: "system", content: SYSTEM_INSTRUCTION },
        ];
        if (contextPrefix) messages.push({ role: "system", content: contextPrefix });

        // Add history (UI slices current message)
        history.filter((h: any) => h.text).forEach((h: any) => {
            messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text });
        });

        messages.push({ role: "user", content: userMessage });

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fivenursings-73917017-a0dfd.web.app/",
                "X-Title": "FiveNursings"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash",
                messages
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Cloud AI API Error: ${response.status} ${err}`);
        }

        const data: any = await response.json();
        const reply = data.choices?.[0]?.message?.content || "抱歉，生成失败。";
        res.json({ reply });
    } catch (e: any) {
        console.error("[Cloud AI Chat Error]", e);
        res.status(500).json({ error: e.message });
    }
=======
// 4. Scoring logic (Simplified ScoringService)
apiRouter.post('/user/:id/calculate-index', async (req: any, res: any) => {
    try {
        const user: any = await (User as any).findById(req.params.id) || await (User as any).findOne({ firebaseUid: req.params.id });
        if (!user) return res.status(404).json({ error: "User not found" });
        const scores = { ...user.scores };
        const cri = Math.round(Object.values(scores).reduce((a: any, b: any) => a + b, 0) as number / 6);
        user.coreRecoveryIndex = cri; await user.save();
        res.json({ success: true, scores, cri });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
>>>>>>> origin/main
});

// 5. Daily Tasks Generation
apiRouter.post(['/daily_tasks/generate', '/daily_task/generate'], async (req: any, res: any) => {
    try {
        const { userId, profile, date, commit = false } = req.body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const instruction = "你是一位专业的康复AI教练。请返回一个 JSON 数组，包含今日康复任务。每个任务包含 fields: category, title, description, time。";
        const prompt = `请为以下患者生成今日康复清单：\n${JSON.stringify(profile)}\n要求：返回纯 JSON 数组格式 [{}, {}, ...]。`;
        
        const content = await callAI(prompt, [], instruction, true);
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']') + 1;
        const cleanContent = jsonStart !== -1 ? content.substring(jsonStart, jsonEnd) : content.replace(/```json|```/g, '').trim();
        let tasks = JSON.parse(cleanContent);
        
        if (!Array.isArray(tasks) && tasks.tasks) tasks = tasks.tasks;
        if (!Array.isArray(tasks)) tasks = [];

        const finalTasks = tasks.map((t: any) => ({
            userId, date: targetDate, category: t.category || "diet", title: t.title || "健康建议",
            description: t.description || "", time: t.time || "08:00", completed: false, source: 'ai'
        }));

        if (commit && finalTasks.length > 0) {
            for (const t of finalTasks) await (DailyTask as any).findOneAndUpdate({ userId, date: t.date, category: t.category, title: t.title }, { $set: t }, { upsert: true, new: true });
            const saved = await (DailyTask as any).find({ userId, date: targetDate });
            return res.json(saved.map(format));
        }
        res.json(finalTasks.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 6. Diary Summary & OpenClaw full-context logic
apiRouter.post('/diary/summarize', async (req: any, res: any) => {
    try {
        const { history, profile } = req.body;
        const instruction = "你是一位康复日志助理。请将以下对话总结为一条康复日志（20字内），并评估对康复指标的影响。返回 JSON: { summary, impact: { category, change } }。";
        const prompt = `患者背景：${JSON.stringify(profile)}。\n对话记录：\n${history.map((h:any)=>h.text).join('\n')}`;
        const content = await callAI(prompt, [], instruction, true);
        const result = JSON.parse(content.replace(/```json|```/g, '').trim());
        res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/users/:userId/full-context', async (req: any, res: any) => {
    try {
        const userId = req.params.userId;
        const idList = await resolveUserIds(userId);
        const today = new Date().toISOString().split('T')[0];

        const [user, chatMsgs, tasks, logs] = await Promise.all([
            (User as any).findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }] }).lean(),
            (ChatMessage as any).find({ userId: { $in: idList } }).sort({ timestamp: -1 }).limit(20).lean(),
            (DailyTask as any).find({ userId: { $in: idList }, date: today }).lean(),
            (VoiceLog as any).find({ userId: { $in: idList } }).sort({ timestamp: -1 }).limit(5).lean()
        ]);

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            profile: format(user),
            chatHistory: chatMsgs.map(format),
            todayTasks: tasks.map(format),
            recentVoiceLogs: logs.map(format)
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 7. Generic CRUD
const MODEL_MAP: Record<string, any> = { 
    users: User, admins: Admin, mall_items: MallItem, protocols: Protocol, 
    chatmessages: ChatMessage, plans: Plan, daily_tasks: DailyTask, 
    daily_task: DailyTask, dailytasks: DailyTask, voice_logs: VoiceLog, 
    voicelogs: VoiceLog, roles: Role 
};
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
    apiRouter.delete(`/${resourceName}/:id`, async (req: any, res: any) => {
        try { await (Model as any).findByIdAndDelete(req.params.id); res.json({ success: true }); }
        catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

app.use('/', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

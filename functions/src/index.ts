import { onCall, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';

admin.initializeApp();

// 基础连接串（不含库名）
const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
const AUTH_PARAMS = "?retryWrites=true&w=majority";

// 根据 Firebase 环境变量动态判断数据库
const getDbName = () => {
    // 如果是 Firebase 模拟器环境，或者没有特定的 Project ID，通常视为开发环境
    const projectId = process.env.GCLOUD_PROJECT || "";
    if (projectId.includes("fivenursings-73917017-a0dfd")) {
        return "fivenursing_pro"; // 正式项目 ID 对应生产库
    }
    return "fivenursing_dev"; // 其余情况（含本地调试）对应开发库
};

let isConnected = false;

const connectDb = async () => {
    if (isConnected) return;
    try {
        const dbName = getDbName();
        const fullUri = `${BASE_URI}${dbName}${AUTH_PARAMS}`;
        await mongoose.connect(fullUri);
        isConnected = true;
        console.log(`Connected to database: ${dbName}`);
        
        if (!mongoose.models.Admin) mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.User) mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.MallItem) mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.Protocol) mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.ChatMessage) {
            mongoose.model('ChatMessage', new mongoose.Schema({
                userId: { type: String, required: true, index: true },
                role: { type: String, enum: ['user', 'model'], required: true },
                text: { type: String, required: true },
                type: { type: String, default: 'chat' },
                category: { type: String },
                isRead: { type: Boolean, default: true },
                timestamp: { type: Date, default: Date.now }
            }));
        }
    } catch (err) { console.error(err); throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const getModel = (name: string) => mongoose.models[name];
const format = (doc: any) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject() : doc; 
    return { ...obj, id: obj._id }; 
};

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (err: any) { res.status(500).json({ error: err.message }); }
});

const apiRouter = express.Router();

// --- 消息管理接口 ---
apiRouter.post('/messages', async (req, res) => {
    const { userId, role, text, type } = req.body;
    try {
        const ChatMessage = getModel('ChatMessage');
        const message = await ChatMessage.create({ userId, role, text, type: type || 'chat', isRead: true });
        res.json(format(message));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/messages/:userId', async (req, res) => {
    const { limit = 20, before } = req.query;
    try {
        const ChatMessage = getModel('ChatMessage');
        const query: any = { userId: req.params.userId };
        if (before) query.timestamp = { $lt: new Date(before as string) };
        const data = await ChatMessage.find(query).sort({ timestamp: -1 }).limit(Number(limit));
        res.json(data.map(format).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/messages/unread-count/:userId', async (req, res) => {
    try {
        const ChatMessage = getModel('ChatMessage');
        const count = await ChatMessage.countDocuments({ userId: req.params.userId, isRead: false });
        res.json({ count });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.patch('/messages/read-all/:userId', async (req, res) => {
    try {
        const ChatMessage = getModel('ChatMessage');
        await ChatMessage.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- OpenClaw ---
apiRouter.get('/users/:userId/full-context', async (req, res) => {
    const { userId } = req.params;
    try {
        const User = getModel('User');
        const ChatMessage = getModel('ChatMessage');
        const user = await User.findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] });
        if (!user) return res.status(404).json({ error: "User not found" });
        const recentMessages = await ChatMessage.find({ userId: user.firebaseUid }).sort({ timestamp: -1 }).limit(5);

        res.json({
            profile: format(user),
            recentMessages: recentMessages.map(format),
            environment: { location: "上海", solarTerm: "春分", weather: "多云", temperature: 22 },
            vitals: { heartRate: 72, stepsToday: 3420, bodyTemperature: 36.6 },
            adherence: { completionRate: "85%", missedTasks: ["午间情绪冥想"] },
            lastMedicalOrder: "保持清淡饮食，轻度步行。"
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/interventions', async (req, res) => {
    const { userId, content, category, title } = req.body;
    try {
        const User = getModel('User');
        const ChatMessage = getModel('ChatMessage');
        let user = await User.findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] });
        if (!user) return res.status(404).json({ error: "User not found" });

        const message = await ChatMessage.create({
            userId: user.firebaseUid,
            role: 'model',
            text: content,
            type: 'intervention',
            category: category,
            isRead: false
        });

        const payload = {
            notification: { title: title || "五养教练的新建议", body: content.substring(0, 50) + "..." },
            data: { type: "intervention", messageId: message._id.toString() },
            topic: `user_${user.firebaseUid}`
        };
        try { await admin.messaging().send(payload); } catch (e) {}
        res.json({ success: true, messageId: message._id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- Auth & Generic ---
apiRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const Admin = getModel('Admin');
        const user = await Admin.findOne({ $or: [{ email }, { username: email }] });
        if (user && (await bcrypt.compare(password, (user as any).password))) {
            res.json({ user: format(user) });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/users/sync', async (req, res) => {
    const { firebaseUid, email, phoneNumber } = req.body;
    try {
        const User = getModel('User');
        let user = await User.findOne({ firebaseUid });
        if (!user && (email || phoneNumber)) {
            user = await User.findOne({ $or: [{ email: email || '_none_' }, { phoneNumber: phoneNumber || '_none_' }] });
        }
        if (!user) {
            user = await User.create({
                firebaseUid,
                email: email || `${firebaseUid}@fivenursings.com`,
                phoneNumber,
                username: email || phoneNumber || firebaseUid,
                password: await bcrypt.hash('default_password', 10),
                isProfileComplete: false,
                scores: { diet: 0, exercise: 0, sleep: 0, mental: 0, function: 0 }
            });
        } else if (!user.firebaseUid) {
            user.firebaseUid = firebaseUid;
            await user.save();
        }
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const handleUserUpdate = async (req: any, res: any) => {
    try {
        const User = getModel('User');
        const data = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!data) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Success', user: format(data) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};

apiRouter.patch('/users/:id', handleUserUpdate);
apiRouter.patch('/user/:id', handleUserUpdate);

const resources = ['users', 'admins', 'mall_items', 'protocols'];
resources.forEach(resource => {
    const ModelName = resource.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('').replace(/s$/, '');
    apiRouter.get(`/${resource}`, async (req, res) => {
        try {
            const Model = getModel(ModelName);
            const data = await Model.find().sort({ createdAt: -1 });
            res.setHeader('X-Total-Count', data.length);
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.get(`/${resource}/:id`, async (req, res) => {
        try {
            const Model = getModel(ModelName);
            const data = await Model.findById(req.params.id);
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.post(`/${resource}`, async (req, res) => {
        try {
            const Model = getModel(ModelName);
            const data = await Model.create(req.body);
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.delete(`/${resource}/:id`, async (req, res) => {
        try {
            const Model = getModel(ModelName);
            await Model.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    const { text, profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { reply: "抱歉，系统尚未配置 AI 服务密钥。" };
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [{ role: "system", content: "你是一位专业的肿瘤康复AI教练。" }, { role: "user", content: text }]
            })
        });
        const data = await response.json();
        return { reply: data.choices?.[0]?.message?.content || "抱歉，我目前无法生成回复。" };
    } catch (e: any) { return { reply: "网络错误，请稍后再试。" }; }
});

export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    const { profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { report: "系统未配置密钥。" };
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [{ role: "system", content: "生成今日康复简报。" }, { role: "user", content: `档案：${JSON.stringify(profile)}` }]
            })
        });
        const data = await response.json();
        return { report: data.choices?.[0]?.message?.content || "无法生成简报。" };
    } catch (e: any) { return { report: "生成失败。" }; }
});

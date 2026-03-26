import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
// import bcrypt from 'bcryptjs';
import * as dotenv from "dotenv";

dotenv.config();

admin.initializeApp();

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
const AUTH_PARAMS = "?retryWrites=true&w=majority";
const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const chatSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    role: String,
    text: String,
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
}, { strict: false, collection: 'chatmessages' });
const adminSchema = new mongoose.Schema({}, { strict: false, collection: 'admins' });
const protocolSchema = new mongoose.Schema({
    key: { type: String, index: true },
    title: String,
    content: String
}, { strict: false, collection: 'protocols' });
const mallItemSchema = new mongoose.Schema({}, { strict: false, collection: 'mall_items' });
const roleSchema = new mongoose.Schema({}, { strict: false, collection: 'roles' });
const planSchema = new mongoose.Schema({}, { strict: false, collection: 'plans' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', protocolSchema);
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', mallItemSchema);
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

let isConnected = false;
const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
        const projectId = config.projectId || admin.app().options.projectId || "";
        const dbName = (projectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        await mongoose.connect(`${BASE_URI}${dbName}${AUTH_PARAMS}`);
        isConnected = true;
    } catch (err) { throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

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

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (e) { res.status(500).json({ error: "DB Connect Failed" }); }
});

const apiRouter = express.Router();

apiRouter.post('/users/sync', async (req: any, res: any) => {
    try {
        const uid = req.body.firebaseUid.trim();
        const suffix = req.body.phoneNumber ? req.body.phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ $or: [{ firebaseUid: uid }, { phoneNumber: new RegExp(suffix + '$') }] } as any);
        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
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
    chatmessages: ChatMessage,
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

// 消息接口
apiRouter.get('/messages/:userId', async (req: any, res: any) => {
    try {
        const data = await ChatMessage.find({ userId: req.params.userId } as any).sort({ timestamp: -1 }).limit(50);
        res.json(data.map(format).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req: any, res: any) => {
    try {
        const { role } = req.body;
        const isRead = role === 'user'; 
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date(), isRead });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/messages/unread-count/:userId', async (req: any, res: any) => {
    try {
        const count = await ChatMessage.countDocuments({ userId: req.params.userId, isRead: false } as any);
        res.json({ count });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.patch('/messages/read-all/:userId', async (req: any, res: any) => {
    try {
        await ChatMessage.updateMany({ userId: req.params.userId, isRead: false } as any, { isRead: true });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/debug-info', async (req: any, res: any) => {
    const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
    const projectId = config.projectId || admin.app().options.projectId || "";
    res.json({ status: "FINAL_STABLE_V9", db: projectId === PROD_PROJECT_ID ? "fivenursing_pro" : "fivenursing_dev" });
});

app.use('/api', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

// --- AI 逻辑实现 ---
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthenticated');
    const { message, text, profile, history = [] } = request.data;
    const userMessage = message || text;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return { reply: "AI服务密钥未配置，请联系管理员。" };

    try {
        const prompt = `患者情况：${profile.cancerType}, 阶段：${profile.stage}, 五养评分：饮食${profile.scores?.diet || 0}, 运动${profile.scores?.exercise || 0}, 睡眠${profile.scores?.sleep || 0}, 心理${profile.scores?.mental || 0}, 功能${profile.scores?.function || 0}。\n用户提问：${userMessage}`;
        
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    ...history.filter((h: any) => h.text).map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
                    { role: "user", content: prompt }
                ],
            }),
        });

        const result = await response.json();
        return { reply: result.choices?.[0]?.message?.content || "抱歉，生成失败。" };
    } catch (e: any) {
        return { reply: "AI服务连接失败: " + e.message };
    }
});

export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthenticated');
    const { profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return { report: "AI服务密钥未配置，请在 Firebase 控制台设置 OPENROUTER_API_KEY。" };

    try {
        const prompt = `请基于患者档案生成一份【今日康复简报】。
患者：${profile.cancerType}, 阶段：${profile.stage}
五养评分：饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}

要求：
1. 采用 Markdown 格式，层级清晰。
2. 给出 1-2 条最核心的今日待办。
3. 语气要温暖、鼓励，字数控制在 200 字左右。
4. 必须包含免责声明。`;

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    { role: "user", content: prompt }
                ],
            }),
        });

        const result = await response.json();
        const report = result.choices?.[0]?.message?.content || "暂时无法生成简报，请稍后再试。";
        return { report };
    } catch (e: any) {
        return { report: "生成失败: " + e.message };
    }
});

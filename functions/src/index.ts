import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import * as dotenv from "dotenv";

dotenv.config();

admin.initializeApp();

const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- Database Schemas ---

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
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
    source: { type: String, default: 'ai' } // 'ai' | 'doctor' | 'custom'
}, { strict: false, collection: 'daily_tasks' });

const voiceLogSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now }
}, { strict: false, collection: 'voice_logs' });

const adminSchema = new mongoose.Schema({}, { strict: false, collection: 'admins' });
const protocolSchema = new mongoose.Schema({
    key: { type: String, index: true },
    title: String,
    content: String
}, { strict: false, collection: 'protocols' });
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
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
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

// AI Utils 
async function callAI(prompt: string, history: any[] = [], systemInstruction: string = "", jsonResponse: boolean = false) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("API Key not configured");

    const messages: any[] = [];
    if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
    history.forEach(h => {
        if (h.text || h.content) messages.push({ role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user', content: h.text || h.content });
    });
    messages.push({ role: "user", content: prompt });

    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${apiKey}`, 
            "Content-Type": "application/json",
            "X-Title": "FiveNursings-Functions"
        },
        body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages,
            response_format: jsonResponse ? { type: "json_object" } : undefined
        }),
    });
    
    if (!response.ok) throw new Error(`AI API Error: ${response.status}`);
    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

async function generateAITasks(profile: any, date: string) {
    const prompt = `你是一位顶尖的肿瘤康复专家。请根据以下患者档案，为他制定【今日五养康复清单】。
患者：${profile.nickname || '用户'}, ${profile.gender}, ${profile.age}岁
病种：${profile.cancerType}, 阶段：${profile.stage}
五养评分：饮食${profile.scores?.diet || 0}, 运动${profile.scores?.exercise || 0}, 睡眠${profile.scores?.sleep || 0}, 心理${profile.scores?.mental || 0}, 功能${profile.scores?.function || 0}
要求：必须覆盖 diet(饮食), exercise(运动), sleep(睡眠), mental(心理), function(机能)。返回严格 JSON 数组格式。`;

    try {
        const content = await callAI(prompt, [], "你是一位康复AI教练。", true);
        const cleanContent = content.replace(/```json|```/g, '').trim();
        const tasks = JSON.parse(cleanContent);
        return tasks.map((t: any) => ({ ...t, date, completed: false, source: 'ai' }));
    } catch (e) {
        console.error("AI Task Generation failed:", e);
        return null;
    }
}

// --- Express App ---

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (e) { res.status(500).json({ error: "DB Connect Failed" }); }
});

const apiRouter = express.Router();

// 核心逻辑：计划生成与管理
apiRouter.post(['/daily_tasks/generate', '/daily_task/generate'], async (req: any, res: any) => {
    try {
        const { userId, profile, date, commit = false } = req.body;
        if (!userId || !profile) return res.status(400).json({ error: "Missing parameters" });
        const targetDate = date || new Date().toISOString().split('T')[0];

        let tasks = await generateAITasks(profile, targetDate);
        if (!tasks) {
            // Fallback static rules
            tasks = [
                { userId, category: 'diet', title: '早起温开水 200ml', description: '引导基础代谢。', time: '07:00', date: targetDate, completed: false, source: 'ai' },
                { userId, category: 'exercise', title: '室内散步 (15min)', description: '维持心脏活力。', time: '17:00', date: targetDate, completed: false, source: 'ai' }
            ];
        }

        const finalTasks = tasks.map((t: any) => ({ ...t, userId }));

        if (commit) {
            for (const t of finalTasks) {
                await (DailyTask as any).findOneAndUpdate(
                    { userId, date: t.date, category: t.category, title: t.title },
                    { $set: t },
                    { upsert: true, new: true }
                );
            }
            const saved = await (DailyTask as any).find({ userId, date: targetDate });
            return res.json(saved.map(format));
        }
        res.json(finalTasks);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 通用 CRUD 模型映射
const MODEL_MAP: Record<string, any> = {
    users: User,
    admins: Admin,
    mall_items: MallItem,
    protocols: Protocol,
    roles: Role,
    chatmessages: ChatMessage,
    plans: Plan,
    daily_tasks: DailyTask,
    daily_task: DailyTask,
    voice_logs: VoiceLog,
    voice_log: VoiceLog
};

Object.keys(MODEL_MAP).forEach(resourceName => {
    const Model = MODEL_MAP[resourceName];
    
    apiRouter.get(`/${resourceName}`, async (req: any, res: any) => {
        try {
            const { userId, date, ...filters } = req.query;
            let queryFilter: any = { ...filters };
            if (userId) {
                const ids = await resolveUserIds(userId as string);
                queryFilter.userId = { $in: ids };
            }
            if (date) queryFilter.date = date;

            const data = await (Model as any).find(queryFilter).sort({ createdAt: -1 });
            res.setHeader('X-Total-Count', data.length);
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.get(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            const data = await (Model as any).findById(req.params.id);
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: "Record not found" }); }
    });

    apiRouter.post(`/${resourceName}`, async (req: any, res: any) => {
        try {
            const data = await (Model as any).create({ ...req.body, createdAt: new Date() });
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.patch(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            const data = await (Model as any).findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.delete(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            await (Model as any).findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

// 特殊业务路径
apiRouter.post('/get-ai-chat-reply', async (req: any, res: any) => {
    try {
        const { message, profile, history = [] } = req.body;
        const systemPrompt = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系提供建议。回复包含[解释]、[今日行动]、[注意事项]。
患者背景：${profile?.nickname || '用户'}, ${profile?.cancerType || '一般状态'}。`;
        const reply = await callAI(message, history, systemPrompt);
        res.json({ reply });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/diary/summarize', async (req: any, res: any) => {
    try {
        const { history, profile } = req.body;
        const prompt = `患者背景：${profile?.cancerType || '康复中'}。请将以下对话总结为康复日志(20字内)：\n${history.map((h:any)=>h.text).join('\n')}`;
        const summary = await callAI(prompt, [], "你是一位康复助理。", true);
        res.json({ summary });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

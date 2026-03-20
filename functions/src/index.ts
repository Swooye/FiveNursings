import { onCall, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';

admin.initializeApp();

const MONGODB_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_pro?retryWrites=true&w=majority";

let isConnected = false;

const connectDb = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log("Connected to production database: fivenursing_pro");
        
        if (!mongoose.models.Admin) mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.User) mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.MallItem) mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.Protocol) mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }));
        // 新增消息模型：用于存储 AI 消息和 OpenClaw 干预建议
        if (!mongoose.models.ChatMessage) {
            mongoose.model('ChatMessage', new mongoose.Schema({
                userId: { type: String, required: true },
                role: { type: String, enum: ['user', 'model'], required: true },
                text: { type: String, required: true },
                type: { type: String, default: 'chat' }, // chat 或 intervention
                isRead: { type: Boolean, default: false },
                timestamp: { type: Date, default: Date.now }
            }));
        }

        const Admin = mongoose.models.Admin;
        const adminEmail = 'admin@fivenursings.com';
        const adminExists = await Admin.findOne({ email: adminEmail });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('123789', 10);
            await Admin.create({ 
                username: 'admin', 
                email: adminEmail, 
                password: hashedPassword, 
                role: 'Super Admin',
                nickname: '超级管理员'
            });
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

// --- OpenClaw 对接接口 ---
apiRouter.post('/interventions', async (req, res) => {
    const { userId, content, category, title } = req.body;
    
    if (!userId || !content) {
        return res.status(400).json({ error: "Missing userId or content" });
    }

    try {
        const ChatMessage = getModel('ChatMessage');
        // 1. 存入数据库
        const message = await ChatMessage.create({
            userId,
            role: 'model',
            text: content,
            type: 'intervention',
            category: category,
            isRead: false,
            timestamp: new Date()
        });

        // 2. 发送 FCM 推送（通知用户）
        const payload = {
            notification: {
                title: title || "五养教练的新建议",
                body: content.substring(0, 50) + "..."
            },
            data: {
                type: "intervention",
                messageId: message._id.toString(),
                click_action: "FLUTTER_NOTIFICATION_CLICK" // 适配移动端点击跳转
            },
            topic: `user_${userId}` // 假设用户订阅了自己的主题
        };

        try {
            await admin.messaging().send(payload);
        } catch (fcmError) {
            console.warn("FCM Push Failed, but database saved:", fcmError);
        }

        res.json({ success: true, messageId: message._id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 获取未读消息统计
apiRouter.get('/messages/unread-count/:userId', async (req, res) => {
    try {
        const ChatMessage = getModel('ChatMessage');
        const count = await ChatMessage.countDocuments({ userId: req.params.userId, isRead: false });
        res.json({ count });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 标记消息为已读
apiRouter.patch('/messages/read-all/:userId', async (req, res) => {
    try {
        const ChatMessage = getModel('ChatMessage');
        await ChatMessage.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- 原有接口保持不变 ---
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

const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、机能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医并升级人工。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    const { text, profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return { reply: "抱歉，系统尚未配置 AI 服务密钥，请联系管理员。" };
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    { 
                      role: "user", 
                      content: `患者信息：${profile?.cancerType || '未知'}，阶段：${profile?.stage || '未知'}。
                      五养分数：饮食(${profile?.scores?.diet || 0})，运动(${profile?.scores?.exercise || 0})，睡眠(${profile?.scores?.sleep || 0})，心态(${profile?.scores?.mental || 0})，机能(${profile?.scores?.function || 0})。
                      用户问题：${text}` 
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter Error:", errorData);
            return { reply: "抱歉，AI 接口目前不可用，请稍后再试。" };
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "抱歉，我目前无法生成回复。";
        return { reply };
    } catch (e: any) {
        console.error("AIChat Function Error:", e);
        return { reply: "抱歉，由于网络问题，我现在无法回答。请检查您的连接或稍后再试。" };
    }
});

export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    const { profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return { report: "抱歉，系统尚未配置 AI 服务密钥，请联系管理员。" };
    }

    const reportInstruction = `你是一位专业的肿瘤康复专家。请根据患者的个人健康档案（病种、阶段、五养评分）生成一份今日康复简报。
    要求：
    1. 语气亲切、积极、充满鼓励。
    2. 内容精炼，不超过 300 字。
    3. 结构清晰：[今日总结]、[核心建议]、[正能量寄语]。
    4. 禁止使用 Markdown 列表符号（如 - 或 *），直接分段陈述。
    5. 必须声明：本简报仅供康养参考。`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [
                    { role: "system", content: reportInstruction },
                    { 
                      role: "user", 
                      content: `患者健康档案：
                      病种：${profile?.cancerType || '未填写'}
                      阶段：${profile?.stage || '未填写'}
                      五养评分：饮食(${profile?.scores?.diet || 0})，运动(${profile?.scores?.exercise || 0})，睡眠(${profile?.scores?.sleep || 0})，心态(${profile?.scores?.mental || 0})，机能(${profile?.scores?.function || 0})。` 
                    }
                ]
            })
        });

        if (!response.ok) {
            return { report: "抱歉，AI 简报服务暂时不可用，请稍后再试。" };
        }

        const data = await response.json();
        const report = data.choices?.[0]?.message?.content || "抱歉，无法生成今日简报。";
        return { report };
    } catch (e: any) {
        console.error("GenerateReport Error:", e);
        return { report: "抱歉，生成简报时遇到错误。" };
    }
});

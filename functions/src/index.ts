import { onCall, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
const AUTH_PARAMS = "?retryWrites=true&w=majority";

// --- 核心 Schema 显式定义 (解决生产环境字段丢失问题) ---
const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, index: true },
    phoneNumber: String,
    email: String,
    nickname: String,
    name: String,
    age: Number,
    gender: String,
    height: Number,
    weight: Number,
    cancerType: String,
    stage: String,
    isProfileComplete: Boolean,
    isQuestionnaireComplete: Boolean,
    avatar: String,
    scores: {
        diet: { type: Number, default: 0 },
        exercise: { type: Number, default: 0 },
        sleep: { type: Number, default: 0 },
        mental: { type: Number, default: 0 },
        function: { type: Number, default: 0 }
    }
}, { strict: false, collection: 'users', timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', new mongoose.Schema({}, { strict: false }), 'chatmessages');

const connectDb = async () => {
    try {
        const isProd = process.env.FIREBASE_CONFIG || process.env.FUNCTION_NAME;
        const dbName = isProd ? "fivenursing_pro" : "fivenursing_dev";
        await mongoose.connect(`${BASE_URI}${dbName}${AUTH_PARAMS}`);
        console.log(`[DB] Connected to: ${dbName}`);
    } catch (err) { throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const format = (doc: any) => { 
    if (!doc) return null; 
    let obj = doc.toObject ? doc.toObject({ getters: true, flattenMaps: true }) : doc; 
    return { ...obj, id: obj._id ? obj._id.toString() : null }; 
};

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (err: any) { res.status(500).json({ error: "DB Error" }); }
});

const apiRouter = express.Router();

apiRouter.post('/users/sync', async (req, res) => {
    const { firebaseUid, email, phoneNumber } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: "No UID" });

    try {
        const cleanUid = firebaseUid.trim();
        const phoneDigits = phoneNumber ? phoneNumber.replace(/\D/g, '').replace(/^86/, '') : '';

        // 强力匹配逻辑 (兼容脏数据后缀)
        let user = await User.findOne({
            $or: [
                { firebaseUid: cleanUid },
                { firebaseUid: new RegExp('^' + cleanUid) },
                { phoneNumber: phoneNumber },
                { phoneNumber: new RegExp(phoneDigits + '$') }
            ]
        });
        
        if (user) {
            if (user.firebaseUid !== cleanUid) {
                user.firebaseUid = cleanUid;
                await user.save();
            }
        } else {
            user = await User.create({ firebaseUid: cleanUid, email, phoneNumber, nickname: '新用户', isProfileComplete: false, createdAt: new Date() });
        }
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/messages/:userId', async (req, res) => {
    try {
        const uid = req.params.userId.trim();
        const data = await ChatMessage.find({ userId: new RegExp(`^${uid}`) }).sort({ timestamp: 1 });
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req, res) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 其余业务接口引用 format 保持一致...
apiRouter.get('/users/:userId/full-context', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: new RegExp(`^${req.params.userId.trim()}`) });
        res.json({ profile: format(user), vitals: { heartRate: 75 }, environment: { weather: "晴" } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const handleUserUpdate = async (req: any, res: any) => {
    try {
        const data = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: 'Success', user: format(data) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
};
apiRouter.patch('/users/:id', handleUserUpdate);
apiRouter.patch('/user/:id', handleUserUpdate);

// Admin Routes
apiRouter.get('/users', async (req, res) => {
    try {
        const data = await User.find().sort({ createdAt: -1 });
        res.setHeader('X-Total-Count', data.length);
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api', apiRouter);
app.use('/', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    const { text, profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { reply: "密钥未配置。" };
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
        return { reply: data.choices?.[0]?.message?.content || "AI 响应异常。" };
    } catch (e: any) { return { reply: "网络错误。" }; }
});

export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    const { profile } = request.data;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { report: "密钥未配置。" };
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
        return { report: data.choices?.[0]?.message?.content || "生成失败。" };
    } catch (e: any) { return { report: "无法生成简报。" }; }
});

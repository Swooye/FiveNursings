import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import * as dotenv from "dotenv";

dotenv.config();

admin.initializeApp();

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
const AUTH_PARAMS = "?retryWrites=true&w=majority";
const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const chatSchema = new mongoose.Schema({}, { strict: false, collection: 'chatmessages' });
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

apiRouter.get('/messages/:userId', async (req: any, res: any) => {
    try {
        const data = await ChatMessage.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(20);
        res.json(data.map(format).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req: any, res: any) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.patch('/messages/read-all/:userId', async (req: any, res: any) => {
    try {
        await ChatMessage.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

// --- [RE-IMPLEMENTED] AI Chat Callable ---
export const getAIChatResponse = onCall({ 
    region: "us-central1", 
    secrets: ["OPENROUTER_API_KEY"] 
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthenticated');

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
    const userText = request.data.text || request.data.prompt || "";
    const profile = request.data.profile || {};

    if (!userText) return { reply: "抱歉，我没听清您的问题。" };

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fivenursings.com"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [
                    { 
                        role: "system", 
                        content: `你是一位专业的肿瘤康复AI教练。用户姓名：${profile.name || '用户'}。请根据其健康状况提供建议。` 
                    },
                    { role: "user", content: userText }
                ]
            })
        });

        const data = await response.json();
        const aiReply = data.choices?.[0]?.message?.content || "收到，我正在分析。";

        return { reply: aiReply };
    } catch (e: any) {
        console.error("AI Error:", e);
        throw new HttpsError('internal', 'AI Service Error');
    }
});

export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    return { report: "今日康复状况良好。" };
});

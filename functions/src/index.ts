import { onCall, onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';

admin.initializeApp();

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
const AUTH_PARAMS = "?retryWrites=true&w=majority";

// 显式配置：100% 确定库名
const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, index: true },
    phoneNumber: String,
    nickname: String,
    name: String,
    height: Number,
    weight: Number,
    cancerType: String,
    stage: String,
    isProfileComplete: Boolean,
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

let isConnected = false;
let currentDb = "";

const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        // 1. 获取当前 Firebase 项目的真实 ID
        const activeProjectId = admin.app().options.projectId || "";
        
        // 2. 逻辑：如果是指定的生产项目，连 pro 库；否则连 dev 库
        currentDb = (activeProjectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        
        const uri = `${BASE_URI}${currentDb}${AUTH_PARAMS}`;
        await mongoose.connect(uri);
        isConnected = true;
        console.log(`[INIT] Project: ${activeProjectId}, DB: ${currentDb}`);
    } catch (err) { console.error("[FATAL DB]", err); throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const format = (doc: any) => { 
    if (!doc) return null; 
    let obj = doc.toObject ? doc.toObject({ getters: true }) : doc; 
    return { ...obj, id: obj._id ? obj._id.toString() : null }; 
};

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (err: any) { res.status(500).json({ error: "Service Connection Error" }); }
});

const apiRouter = express.Router();

// 诊断接口 (极其重要)
apiRouter.get('/debug-info', async (req, res) => {
    const totalUsers = await User.countDocuments({});
    res.json({
        resolvedDb: currentDb,
        userCount: totalUsers,
        projectId: admin.app().options.projectId,
        nodeEnv: process.env.NODE_ENV
    });
});

apiRouter.post('/users/sync', async (req, res) => {
    const { firebaseUid, phoneNumber } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: "Missing UID" });

    try {
        const cleanUid = firebaseUid.trim();
        const phoneSuffix = phoneNumber ? phoneNumber.replace(/\D/g, '').slice(-11) : "";

        // 优先精准搜索，次选正则模糊搜索
        let user = await User.findOne({ 
            $or: [
                { firebaseUid: cleanUid },
                { firebaseUid: new RegExp('^' + cleanUid) }
            ]
        });

        if (!user && phoneSuffix) {
            user = await User.findOne({ phoneNumber: new RegExp(phoneSuffix + '([, ]*|$)') });
            if (user) {
                user.firebaseUid = cleanUid;
                await user.save();
            }
        }

        if (user) return res.json(format(user));

        // 如果真的没找到才创建新用户
        user = await User.create({ firebaseUid: cleanUid, phoneNumber, nickname: '新用户', isProfileComplete: false });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 其他接口...
apiRouter.get('/messages/:userId', async (req, res) => {
    try {
        const data = await ChatMessage.find({ userId: new RegExp(`^${req.params.userId.trim()}`) }).sort({ timestamp: 1 });
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req, res) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api', apiRouter);
app.use('/', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { reply: "OK" } }; });
export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { report: "OK" } }; });

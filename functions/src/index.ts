import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';

admin.initializeApp();

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
const AUTH_PARAMS = "?retryWrites=true&w=majority";
const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";

// --- 模型定义 ---
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', new mongoose.Schema({}, { strict: false, collection: 'chatmessages' }));
const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({}, { strict: false, collection: 'admins' }));
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', new mongoose.Schema({}, { strict: false, collection: 'protocols' }));
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', new mongoose.Schema({}, { strict: false, collection: 'mall_items' }));

let isConnected = false;
let dbName = "";

const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
        const projectId = config.projectId || admin.app().options.projectId || "";
        dbName = (projectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        await mongoose.connect(`${BASE_URI}${dbName}${AUTH_PARAMS}`);
        isConnected = true;
    } catch (err) { throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- 终极格式化：解决 ID [object Object] ---
const format = (doc: any) => { 
    if (!doc) return null; 
    // 1. 先转换为普通对象
    const obj = doc.toObject ? doc.toObject({ getters: true, versionKey: false }) : doc; 
    
    // 2. 强制处理 ID
    const idStr = obj._id ? obj._id.toString() : (obj.id ? obj.id.toString() : null);
    
    // 3. 定义内部清洗逻辑
    const sanitizeValue = (v: any): any => {
        if (typeof v === 'string') return v.replace(/[, ]+$/, '').trim();
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            const cleaned: any = {};
            for (const key in v) cleaned[key] = sanitizeValue(v[key]);
            return cleaned;
        }
        return v;
    };

    const result = sanitizeValue(obj);
    result.id = idStr;
    result._id = idStr;
    return result; 
};

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (e) { res.status(500).json({ error: "DB Connect Failed" }); }
});

const apiRouter = express.Router();

// 管理后台登录
apiRouter.post('/login', async (req: any, res: any) => {
    const { email, password } = req.body;
    try {
        const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] } as any);
        if (adminUser && (await bcrypt.compare(password, (adminUser as any).password))) {
            res.json({ user: format(adminUser) });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 用户同步
apiRouter.post('/users/sync', async (req: any, res: any) => {
    const { firebaseUid, phoneNumber } = req.body;
    try {
        const uid = firebaseUid.trim();
        const suffix = phoneNumber ? phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ 
            $or: [
                { firebaseUid: uid },
                { firebaseUid: new RegExp('^' + uid) },
                { phoneNumber: new RegExp(suffix + '$') }
            ]
        } as any);

        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await User.create({ firebaseUid: uid, phoneNumber, nickname: '新用户', isProfileComplete: false });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 通用资源管理
const MODEL_MAP: Record<string, any> = {
    users: User,
    admins: Admin,
    mall_items: MallItem,
    protocols: Protocol
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
        const data = await ChatMessage.find({ userId: req.params.userId } as any).sort({ timestamp: 1 });
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req: any, res: any) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/debug-info', async (req: any, res: any) => {
    res.json({ status: "FINAL_STABLE_V8", db: dbName });
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { reply: "OK" } }; });
export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { report: "OK" } }; });

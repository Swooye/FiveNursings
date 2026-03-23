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

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const chatSchema = new mongoose.Schema({}, { strict: false, collection: 'chatmessages' });
const adminSchema = new mongoose.Schema({}, { strict: false, collection: 'admins' });
const protocolSchema = new mongoose.Schema({}, { strict: false, collection: 'protocols' });
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
let dbNameGlobal = "";

const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
        const projectId = config.projectId || admin.app().options.projectId || "";
        dbNameGlobal = (projectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        await mongoose.connect(`${BASE_URI}${dbNameGlobal}${AUTH_PARAMS}`);
        isConnected = true;
    } catch (err) { throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- 修复后的 format 函数：兼容 Date 对象 ---
const format = (doc: any) => { 
    if (!doc) return null; 
    let obj = doc.toObject ? doc.toObject({ getters: true, versionKey: false }) : doc; 
    const idStr = obj._id ? obj._id.toString() : (obj.id ? obj.id.toString() : null);
    
    const sanitizeValue = (v: any): any => {
        if (typeof v === 'string') return v.replace(/[, ]+$/, '').trim();
        // 关键修复：防止递归清洗破坏 Date 和 Array
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
    try { await connectDb(); next(); } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

const apiRouter = express.Router();

apiRouter.post('/login', async (req: any, res: any) => {
    const { email, password } = req.body;
    try {
        const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] } as any);
        if (adminUser && (await bcrypt.compare(password, (adminUser as any).password))) {
            res.json({ user: format(adminUser) });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/users/sync', async (req: any, res: any) => {
    const { firebaseUid, phoneNumber } = req.body;
    try {
        const uid = firebaseUid.trim();
        const suffix = phoneNumber ? phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ $or: [{ firebaseUid: uid }, { firebaseUid: new RegExp('^' + uid) }, { phoneNumber: new RegExp(suffix + '$') }] } as any);
        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await User.create({ firebaseUid: uid, phoneNumber, nickname: '新用户', isProfileComplete: false });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const MODEL_MAP: Record<string, any> = {
    users: User,
    admins: Admin,
    mall_items: MallItem,
    protocols: Protocol,
    roles: Role,
    plans: Plan // 补全 plans 路由
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
});

// 获取聊天记录 (支持分页)
apiRouter.get('/messages/:userId', async (req: any, res: any) => {
    const { limit = 20, before } = req.query;
    try {
        const query: any = { userId: req.params.userId };
        if (before) {
            query.timestamp = { $lt: new Date(before) };
        }
        const data = await ChatMessage.find(query).sort({ timestamp: -1 }).limit(Number(limit));
        res.json(data.map(format).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req: any, res: any) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/protocols/key/:key', async (req: any, res: any) => {
    try {
        const protocol = await Protocol.findOne({ key: req.params.key } as any);
        res.json(format(protocol));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api', apiRouter);
app.use('/', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { reply: "OK" } }; });
export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { report: "OK" } }; });

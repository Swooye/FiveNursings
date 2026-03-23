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

// --- OpenClaw ---
apiRouter.get('/users/:userId/full-context', async (req: any, res: any) => {
    try {
        const user = await User.findOne({ $or: [{ firebaseUid: req.params.userId }, { _id: mongoose.Types.ObjectId.isValid(req.params.userId) ? req.params.userId : null }] } as any);
        if (!user) return res.status(404).json({ error: "User not found" });
        const recentMessages = await ChatMessage.find({ userId: user.firebaseUid }).sort({ timestamp: -1 }).limit(5);
        res.json({ profile: format(user), recentMessages: recentMessages.map(format), environment: { weather: "晴" }, vitals: { heartRate: 72 } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/interventions', async (req: any, res: any) => {
    try {
        const user = await User.findOne({ $or: [{ firebaseUid: req.body.userId }, { _id: mongoose.Types.ObjectId.isValid(req.body.userId) ? req.body.userId : null }] } as any);
        if (!user) return res.status(404).json({ error: "User not found" });
        const msg = await ChatMessage.create({ userId: user.firebaseUid, role: 'model', text: req.body.content, type: 'intervention', isRead: false, timestamp: new Date() });
        res.json({ success: true, messageId: msg._id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- Auth ---
apiRouter.post('/login', async (req: any, res: any) => {
    try {
        const adminUser = await Admin.findOne({ $or: [{ email: req.body.email }, { username: req.body.email }] } as any);
        if (adminUser && (await bcrypt.compare(req.body.password, (adminUser as any).password))) {
            res.json({ user: format(adminUser) });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/users/sync', async (req: any, res: any) => {
    try {
        const uid = req.body.firebaseUid.trim();
        const suffix = req.body.phoneNumber ? req.body.phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ $or: [{ firebaseUid: uid }, { firebaseUid: new RegExp('^' + uid) }, { phoneNumber: new RegExp(suffix + '$') }] } as any);
        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await User.create({ firebaseUid: uid, phoneNumber: req.body.phoneNumber, nickname: '新用户', isProfileComplete: false });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

const MODEL_MAP: Record<string, any> = { users: User, admins: Admin, mall_items: MallItem, protocols: Protocol, roles: Role, plans: Plan };

Object.keys(MODEL_MAP).forEach(r => {
    const M = MODEL_MAP[r];
    apiRouter.get(`/${r}`, async (req: any, res: any) => {
        try {
            const data = await M.find().sort({ createdAt: -1 });
            res.setHeader('X-Total-Count', data.length);
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.get(`/${r}/:id`, async (req: any, res: any) => {
        try { res.json(format(await M.findById(req.params.id))); } catch (e: any) { res.status(500).json({ error: "Not found" }); }
    });
    apiRouter.patch(`/${r}/:id`, async (req: any, res: any) => {
        try { res.json(format(await M.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }))); } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.post(`/${r}`, async (req: any, res: any) => {
        try { res.json(format(await M.create({ ...req.body, createdAt: new Date() }))); } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
    apiRouter.delete(`/${r}/:id`, async (req: any, res: any) => {
        try { await M.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

apiRouter.get('/messages/:userId', async (req: any, res: any) => {
    try {
        const data = await ChatMessage.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(20);
        res.json(data.map(format).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/protocols/key/:key', async (req: any, res: any) => {
    try { res.json(format(await Protocol.findOne({ key: req.params.key } as any))); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { reply: "OK" } }; });
export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { report: "OK" } }; });

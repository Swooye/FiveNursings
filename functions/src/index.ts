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

// --- 显式模型定义 ---
const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, index: true },
    phoneNumber: String,
    nickname: String,
    name: String,
    height: Number,
    weight: Number,
    isProfileComplete: Boolean,
    scores: {
        diet: { type: Number, default: 0 },
        exercise: { type: Number, default: 0 },
        sleep: { type: Number, default: 0 },
        mental: { type: Number, default: 0 },
        function: { type: Number, default: 0 }
    }
}, { strict: false, collection: 'users', timestamps: true });

const chatSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: true },
    type: { type: String, default: 'chat' }
}, { strict: false, collection: 'chatmessages' });

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { strict: false, collection: 'admins' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }), 'protocols');
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }), 'mall_items');

let isConnected = false;
let dbNameGlobal = "";

const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const projectId = admin.app().options.projectId || "";
        dbNameGlobal = (projectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        await mongoose.connect(`${BASE_URI}${dbNameGlobal}${AUTH_PARAMS}`);
        isConnected = true;
    } catch (err) { console.error(err); throw err; }
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const format = (doc: any) => { 
    if (!doc) return null; 
    let obj = doc.toObject ? doc.toObject({ getters: true }) : doc; 
    const sanitize = (v: any): any => {
        if (typeof v === 'string') return v.replace(/[, ]+$/, '').trim();
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            const c: any = {};
            for (const k in v) c[k] = sanitize(v[k]);
            return c;
        }
        return v;
    };
    const cleaned = sanitize(obj);
    return { ...cleaned, id: cleaned._id ? cleaned._id.toString() : null }; 
};

app.use(async (req, res, next) => {
    try { await connectDb(); next(); } catch (err: any) { res.status(500).json({ error: "DB Connect Failed" }); }
});

const apiRouter = express.Router();

// 1. Admin Login
apiRouter.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] } as any);
        if (adminUser && (await bcrypt.compare(password, (adminUser as any).password))) {
            res.json({ user: format(adminUser) });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 2. User Sync
apiRouter.post('/users/sync', async (req, res) => {
    const { firebaseUid, phoneNumber } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: "No UID" });
    try {
        const uid = firebaseUid.trim();
        const phoneSuffix = phoneNumber ? phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ 
            $or: [
                { firebaseUid: uid },
                { firebaseUid: new RegExp('^' + uid) },
                { phoneNumber: new RegExp(phoneSuffix + '([, ]*|$)') }
            ]
        } as any);

        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await User.create({ firebaseUid: uid, phoneNumber, nickname: '新用户', isProfileComplete: false });
        return res.json(format(user));
    } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// 3. REST Resources
const resources = ['users', 'admins', 'mall_items', 'protocols'];
resources.forEach(r => {
    const M: any = r === 'users' ? User : (r === 'admins' ? Admin : (r === 'mall_items' ? MallItem : Protocol));
    
    apiRouter.get(`/${r}`, async (req, res) => {
        try {
            const data = await M.find().sort({ createdAt: -1 });
            res.setHeader('X-Total-Count', data.length);
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.get(`/${r}/:id`, async (req, res) => {
        try {
            const data = await M.findById(req.params.id);
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    apiRouter.patch(`/${r}/:id`, async (req, res) => {
        try {
            const data = await M.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

// 4. Messages
apiRouter.get('/messages/:userId', async (req, res) => {
    try {
        const data = await ChatMessage.find({ userId: new RegExp('^' + req.params.userId.trim()) } as any).sort({ timestamp: 1 });
        res.json(data.map(format));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req, res) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/debug-info', async (req, res) => {
    const count = await User.countDocuments({});
    res.json({ status: "PRO_ALL_RESTORED_V7", db: dbNameGlobal, count });
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async () => { return { data: { reply: "OK" } }; });
export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { report: "OK" } }; });

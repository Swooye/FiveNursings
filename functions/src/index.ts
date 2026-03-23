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

const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', protocolSchema);
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', mallItemSchema);
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

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
    try { await connectDb(); next(); } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

const MODEL_MAP: Record<string, any> = {
    users: User,
    admins: Admin,
    mall_items: MallItem,
    protocols: Protocol,
    roles: Role
};

// 动态注册路由
Object.keys(MODEL_MAP).forEach(r => {
    const M = MODEL_MAP[r];
    
    const listHandler = async (req: any, res: any) => {
        try {
            const data = await M.find().sort({ createdAt: -1 });
            res.setHeader('X-Total-Count', data.length);
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.json(data.map(format));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    };

    const getHandler = async (req: any, res: any) => {
        try {
            const data = await M.findById(req.params.id);
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: "Not found" }); }
    };

    const patchHandler = async (req: any, res: any) => {
        try {
            const data = await M.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    };

    const postHandler = async (req: any, res: any) => {
        try {
            const data = await M.create({ ...req.body, createdAt: new Date() });
            res.json(format(data));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    };

    const deleteHandler = async (req: any, res: any) => {
        try { await M.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
    };

    app.get(`/${r}`, listHandler);
    app.get(`/api/${r}`, listHandler);
    app.get(`/${r}/:id`, getHandler);
    app.get(`/api/${r}/:id`, getHandler);
    app.patch(`/${r}/:id`, patchHandler);
    app.patch(`/api/${r}/:id`, patchHandler);
    app.post(`/${r}`, postHandler);
    app.post(`/api/${r}`, postHandler);
    app.delete(`/${r}/:id`, deleteHandler);
    app.delete(`/api/${r}/:id`, deleteHandler);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] } as any);
        if (adminUser && (await bcrypt.compare(password, (adminUser as any).password))) {
            res.json({ user: format(adminUser) });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/protocols/key/:key', async (req, res) => {
    try {
        const protocol = await Protocol.findOne({ key: req.params.key } as any);
        res.json(format(protocol));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 使用一下 ChatMessage 避免 TS6133 错误
console.log("ChatMessage initialized:", ChatMessage.modelName);

export const api = onRequest({ region: "us-central1" }, app);

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { reply: "OK" } }; });
export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => { return { data: { report: "OK" } }; });

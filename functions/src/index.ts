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
        
        // Define models only once
        if (!mongoose.models.Admin) mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.User) mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.MallItem) mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
        if (!mongoose.models.Protocol) mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }));

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

export const getAIChatResponse = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    return { status: "ready" };
});

export const generateHealthReport = onCall({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    return { status: "ready" };
});

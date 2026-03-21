require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3002;

// 强制本地连接开发库
const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] }));
app.use(bodyParser.json());
app.use('/uploads', express.static(uploadDir));

const arrayHeadersMiddleware = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (Array.isArray(data)) {
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.setHeader('X-Total-Count', data.length);
        }
        return originalJson.call(this, data);
    };
    next();
};
app.use(arrayHeadersMiddleware);

// Models
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }));
const Protocol = mongoose.model('Protocol', new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
}, { strict: false }));

const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    type: { type: String, default: 'chat' }, 
    isRead: { type: Boolean, default: true },
    timestamp: { type: Date, default: Date.now }
}, { strict: false }));

const format = (doc) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject() : doc; 
    return { ...obj, id: obj._id }; 
};

// --- 用户同步核心逻辑 (修复“新用户”问题) ---
app.post('/api/users/sync', async (req, res) => {
    const { firebaseUid, email, phoneNumber } = req.body;
    try {
        // 1. 优先通过 firebaseUid 查找
        let user = await User.findOne({ firebaseUid });
        
        // 2. 如果没找到，尝试通过邮箱或手机号找回老数据
        if (!user && (email || phoneNumber)) {
            user = await User.findOne({ 
                $or: [
                    { email: email || '_none_' }, 
                    { phoneNumber: phoneNumber || '_none_' }
                ] 
            });
            
            // 如果找到了老数据，立即绑定 firebaseUid
            if (user) {
                user.firebaseUid = firebaseUid;
                await user.save();
                console.log(`Linked existing user ${user.nickname || user.name} to Firebase UID ${firebaseUid}`);
            }
        }
        
        // 3. 依然没找到，才创建新用户
        if (!user) {
            user = await User.create({
                firebaseUid,
                email: email || `${firebaseUid}@fivenursings.com`,
                phoneNumber,
                username: email || phoneNumber || firebaseUid,
                nickname: '新用户',
                isProfileComplete: false,
                scores: { diet: 0, exercise: 0, sleep: 0, mental: 0, function: 0 }
            });
        }
        
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AUTH ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const adminUser = await Admin.findOne({ $or: [{ email }, { username: email }] });
    if (adminUser && (await bcrypt.compare(password, adminUser.password))) {
      res.json({ user: format(adminUser) });
    } else { res.status(401).json({ message: 'Invalid credentials' }); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 其他路由保持一致 ---
app.post('/api/messages', async (req, res) => {
    try {
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date() });
        res.json(format(msg));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:userId', async (req, res) => {
    const { userId } = req.params;
    const { before, limit = 20 } = req.query;
    try {
        const query = { userId };
        if (before) query.timestamp = { $lt: new Date(before) };
        const data = await ChatMessage.find(query).sort({ timestamp: -1 }).limit(Number(limit));
        res.json(data.map(format).reverse());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/unread-count/:userId', async (req, res) => {
    try {
        const count = await ChatMessage.countDocuments({ userId: req.params.userId, isRead: false });
        res.json({ count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/messages/read-all/:userId', async (req, res) => {
    try {
        await ChatMessage.updateMany({ userId: req.params.userId, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/interventions', async (req, res) => {
    const { userId, content } = req.body;
    try {
        let user = await User.findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] });
        if (!user) return res.status(404).json({ error: "User not found" });
        const msg = await ChatMessage.create({
            userId: user.firebaseUid,
            role: 'model',
            text: content,
            type: 'intervention',
            isRead: false,
            timestamp: new Date()
        });
        res.json({ success: true, messageId: msg._id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:userId/full-context', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] });
        if (!user) return res.status(404).json({ error: "User not found" });
        const recentMessages = await ChatMessage.find({ userId: user.firebaseUid }).sort({ timestamp: -1 }).limit(5);
        res.json({
            profile: format(user),
            recentMessages: recentMessages.map(format),
            environment: { location: "上海", solarTerm: "春分", weather: "晴", temperature: 20 },
            vitals: { heartRate: 75, stepsToday: 5000, bodyTemperature: 36.5 },
            adherence: { completionRate: "90%", missedTasks: [] },
            lastMedicalOrder: "保持心情愉快。"
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const createRoutes = (path, Model) => {
  app.get(`/api/${path}`, async (req, res) => {
    try { const data = await Model.find().sort({ createdAt: -1 }); res.json(data.map(format)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(`/api/${path}/:id`, async (req, res) => {
    try { const data = await Model.findById(req.params.id); res.json(format(data)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.post(`/api/${path}`, async (req, res) => {
    try { const data = await Model.create(req.body); res.json(format(data)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.patch(`/api/${path}/:id`, async (req, res) => {
    try { 
        const updated = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        res.json(format(updated)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { await Model.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });
};

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);

const startServer = async () => {
    try {
        await mongoose.connect(BASE_URI);
        console.log(`Connected to database: ${mongoose.connection.name}`);
        app.listen(port, () => console.log(`Server is running on port ${port}`));
    } catch (err) { console.error('Failed to start server:', err); }
};
startServer();

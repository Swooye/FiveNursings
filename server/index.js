require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const port = 3002;

// --- 基础配置 ---
const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";
const OPENROUTER_API_KEY = "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";

app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] 
}));
app.use(bodyParser.json());

// 响应头处理：自动暴露 X-Total-Count
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (Array.isArray(data)) {
            res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
            res.setHeader('X-Total-Count', data.length);
        }
        return originalJson.call(this, data);
    };
    next();
});

// --- 模型定义 ---
const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users', timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    username: String
}, { strict: false }), 'admins');
const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }), 'mall_items');
const Protocol = mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }), 'protocols');
const ChatMessage = mongoose.model('ChatMessage', new mongoose.Schema({
    userId: { type: String, index: true },
    role: String,
    text: String,
    type: { type: String, default: 'chat' },      // 'chat' | 'intervention'
    category: { type: String },                     // e.g. '饮食养', '运动养'
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { strict: false }), 'chatmessages');
const Role = mongoose.model('Role', new mongoose.Schema({
    name: { type: String, required: true },
    key: String
}, { strict: false }), 'roles');
const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');

const format = (doc) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject({ getters: true }) : doc; 
    const idStr = obj._id ? obj._id.toString() : (obj.id ? obj.id.toString() : null);
    return { ...obj, id: idStr, _id: idStr }; 
};

// --- 自动路由生成器 ---
const createRoutes = (path, Model) => {
  app.get(`/api/${path}`, async (req, res) => {
    try { 
      const data = await Model.find().sort({ createdAt: -1 }); 
      res.json(data.map(format)); 
    } catch (e) { 
      console.error(`GET /api/${path} error:`, e); 
      res.status(500).json({ error: e.message }); 
    }
  });
  app.get(`/api/${path}/:id`, async (req, res) => {
    try { 
      const data = await Model.findById(req.params.id); 
      res.json(format(data)); 
    } catch (e) { 
      console.error(`GET /api/${path}/:id error:`, e); 
      res.status(500).json({ error: e.message }); 
    }
  });
  app.post(`/api/${path}`, async (req, res) => {
    try { 
      const data = await Model.create({ ...req.body, createdAt: new Date() }); 
      res.json(format(data)); 
    } catch (e) { 
      console.error(`POST /api/${path} error:`, e); 
      res.status(500).json({ error: e.message }); 
    }
  });
  app.patch(`/api/${path}/:id`, async (req, res) => {
    try { 
        const updated = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        res.json(format(updated)); 
    } catch (e) { 
      console.error(`PATCH /api/${path}/:id error:`, e); 
      res.status(500).json({ error: e.message }); 
    }
  });
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { 
      await Model.findByIdAndDelete(req.params.id); 
      res.json({ success: true }); 
    } catch (e) { 
      console.error(`DELETE /api/${path}/:id error:`, e); 
      res.status(500).json({ error: e.message }); 
    }
  });
};

app.post('/api/users/sync', async (req, res) => {
    try {
        const uid = req.body.firebaseUid.trim();
        const suffix = req.body.phoneNumber ? req.body.phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ $or: [{ firebaseUid: uid }, { phoneNumber: new RegExp(suffix + '$') }] });
        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await User.create({ 
            firebaseUid: uid, 
            phoneNumber: req.body.phoneNumber, 
            nickname: '新用户', 
            isProfileComplete: false,
            createdAt: new Date()
        });
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);
createRoutes('roles', Role);
createRoutes('chatmessages', ChatMessage);
createRoutes('plans', Plan);

// 特殊处理单数形式的 /api/user 及其 ID 兼容性 (支持 MongoDB _id 或 Firebase UID)
app.get('/api/user/:id', async (req, res) => {
  try {
      let user = await User.findById(req.params.id);
      if (!user) user = await User.findOne({ firebaseUid: req.params.id });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(format(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/user/:id', async (req, res) => {
  try {
      let user = await User.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
      if (!user) user = await User.findOneAndUpdate({ firebaseUid: req.params.id }, { ...req.body, updatedAt: new Date() }, { new: true });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(format(user));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 消息接口 ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminUser = await Admin.findOne({ email });
        if (!adminUser) return res.status(401).json({ error: '用户不存在' });
        
        let isMatch = false;
        if (adminUser.password === password) {
            isMatch = true;
        } else if (password && adminUser.password) {
            try {
                isMatch = await bcrypt.compare(password, adminUser.password);
            } catch (e) {
                console.error("Bcrypt compare fail:", e);
            }
        }

        if (isMatch) {
            res.json(format(adminUser));
        } else {
            res.status(401).json({ error: '密码错误' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- [核心] 为 OpenClaw 提供的全维上下文接口 ---
const getSolarTerm = () => {
    const m = new Date().getMonth() + 1;
    const d = new Date().getDate();
    const terms = {
        1: ['小寒', '大寒'], 2: ['立春', '雨水'], 3: ['惊蛰', '春分'],
        4: ['清明', '谷雨'], 5: ['立夏', '小满'], 6: ['芒种', '夏至'],
        7: ['小暑', '大暑'], 8: ['立秋', '处暑'], 9: ['白露', '秋分'],
        10: ['寒露', '霜降'], 11: ['立冬', '小雪'], 12: ['大雪', '冬至']
    };
    return d < 16 ? terms[m][0] : terms[m][1];
};

app.get('/api/users/:userId/full-context', async (req, res) => {
    const { userId } = req.params;
    try {
        let user = await User.findOne({ firebaseUid: userId });
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        }
        if (!user) return res.status(404).json({ error: "User not found" });

        const recentMessages = await ChatMessage.find({ userId: user.firebaseUid || userId })
            .sort({ timestamp: -1 })
            .limit(5);

        const mockEnvironment = {
            location: "上海市",
            time: new Date().toISOString(),
            solarTerm: getSolarTerm(),
            weather: "多云转晴",
            temperature: 22,
            humidity: "65%",
            airQuality: "优",
            altitude: 15
        };

        const mockVitals = {
            heartRate: 72,
            stepsToday: 3420,
            sleepQuality: "良好",
            lastBloodPressure: "120/80 mmHg",
            bodyTemperature: 36.6
        };

        const mockAdherence = {
            completionRate: "85%",
            missedTasks: ["午间情绪冥想"]
        };

        res.json({
            profile: format(user),
            recentMessages: recentMessages.map(format),
            environment: mockEnvironment,
            vitals: mockVitals,
            adherence: mockAdherence,
            lastMedicalOrder: "术后第二周，保持清淡饮食，轻度步行。"
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OpenClaw 干预推送接口 ---
app.post('/api/interventions', async (req, res) => {
    const { userId, content, category, title } = req.body;
    if (!userId || !content) {
        return res.status(400).json({ error: "userId and content are required" });
    }
    try {
        let user = await User.findOne({ firebaseUid: userId });
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        }
        if (!user) return res.status(404).json({ error: "User not found" });

        const targetUid = user.firebaseUid || userId;

        const message = await ChatMessage.create({
            userId: targetUid,
            role: 'model',
            text: content,
            type: 'intervention',
            category: category || '健康干预',
            isRead: false,
            timestamp: new Date()
        });

        res.json({ success: true, messageId: message._id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 消息接口 — 精确路径必须在参数路由之前
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

app.post('/api/messages', async (req, res) => {
    try {
        const { role } = req.body;
        const isRead = role === 'user'; 
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date(), isRead });
        res.json(format(msg));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:userId', async (req, res) => {
    try {
        const data = await ChatMessage.find({ userId: req.params.userId }).sort({ timestamp: 1 });
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AI 问答对话接口 ---
const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;

app.post('/api/get-ai-chat-reply', async (req, res) => {
    const { message, text, profile, history = [] } = req.body;
    const userMessage = message || text;
    const apiKey = OPENROUTER_API_KEY;

    if (!apiKey) return res.status(400).json({ error: "API Key not configured" });

    const contextPrefix = `[患者背景] 类型：${profile.cancerType}, 阶段：${profile.stage}, 五养分数：饮食${profile.scores?.diet || 0}/100, 运动${profile.scores?.exercise || 0}/100, 睡眠${profile.scores?.sleep || 0}/100, 心理${profile.scores?.mental || 0}/100, 功能${profile.scores?.function || 0}/100。`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "FiveNursings-Local"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    { role: "system", content: contextPrefix },
                    ...history.filter(h => h.text).map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
                    { role: "user", content: userMessage }
                ],
            }),
        });
        const data = await response.json();
        if (data.error) {
            console.error("Local AI Chat Error:", data.error);
            return res.json({ reply: `AI服务错误: ${data.error.message || JSON.stringify(data.error)}` });
        }
        const reply = data.choices?.[0]?.message?.content || "抱歉，生成失败。";
        res.json({ reply });
    } catch (e) {
        console.error("Local AI Chat Catch:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/generate-health-report', async (req, res) => {
    const { profile } = req.body;
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "API Key not configured" });

    const prompt = `请基于以下患者档案生成一份【今日康复简报】。
患者：${profile.cancerType}, 阶段：${profile.stage}
五养评分：饮食${profile.scores?.diet || 0}, 运动${profile.scores?.exercise || 0}, 睡眠${profile.scores?.sleep || 0}, 心理${profile.scores?.mental || 0}, 功能${profile.scores?.function || 0}

要求：
1. 采用 Markdown 格式，层级清晰。
2. 给出 1-2 条最核心的今日待办。
3. 语气要温暖、鼓励，字数控制在 200 字左右。
4. 必须包含免责声明：本建议不构成医疗诊断。`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "FiveNursings-Local"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: "你是一位专业的肿瘤康复AI教练。" },
                    { role: "user", content: prompt }
                ],
            }),
        });
        const data = await response.json();
        if (data.error) {
            console.error("Local health report Error:", data.error);
            return res.json({ report: `暂时无法生成简报: ${data.error.message || JSON.stringify(data.error)}` });
        }
        const report = data.choices?.[0]?.message?.content || "暂时无法生成简报，请稍后再试。";
        res.json({ report });
    } catch (e) {
        console.error("Local health report Catch:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- 服务启动 ---
mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("MongoDB connected successfully.");
    app.listen(port, () => console.log(`Dev Server running on port ${port}`));
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

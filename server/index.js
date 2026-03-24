require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3002;

const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || "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";

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] }));
app.use(bodyParser.json());

const format = (doc) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject({ getters: true }) : doc; 
    return { ...obj, id: obj._id ? obj._id.toString() : null }; 
};

// 模型定义
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', new mongoose.Schema({}, { strict: false }), 'chatmessages');
const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({}, { strict: false }), 'admins');
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }), 'mall_items');
const Protocol = mongoose.models.Protocol || mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }), 'protocols');
const Role = mongoose.models.Role || mongoose.model('Role', new mongoose.Schema({}, { strict: false }), 'roles');
const Plan = mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');

// 自动路由生成器
const createRoutes = (path, Model) => {
  app.get(`/api/${path}`, async (req, res) => {
    try { const data = await Model.find().sort({ createdAt: -1 }); res.json(data.map(format)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.get(`/api/${path}/:id`, async (req, res) => {
    try { const data = await Model.findById(req.params.id); res.json(format(data)); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.post(`/api/${path}`, async (req, res) => {
    try { res.json(format(await Model.create({ ...req.body, createdAt: new Date() }))); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.patch(`/api/${path}/:id`, async (req, res) => {
    try { res.json(format(await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }))); } catch (e) { res.status(500).json({ error: e.message }); }
  });
  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { await Model.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
  });
};

createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);
createRoutes('roles', Role);
createRoutes('plans', Plan);

// AI 与业务接口
app.post('/api/ai-chat', async (req, res) => {
    const { prompt, userId } = req.body;
    try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [{ role: "system", content: "你是一位专业的AI康复教练。" }, { role: "user", content: prompt }]
            })
        });
        const data = await aiRes.json();
        const reply = data.choices?.[0]?.message?.content || "收到。";
        await ChatMessage.create({ userId, role: 'model', text: reply, timestamp: new Date() });
        res.json({ reply });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:userId', async (req, res) => {
    try {
        const data = await ChatMessage.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(20);
        res.json(data.map(format).reverse());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("MongoDB Connected. Routes Registered: users, admins, mall_items, protocols, roles, plans");
    app.listen(port, () => console.log(`Dev Server listening on port ${port}`));
});

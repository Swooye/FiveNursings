require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// 导入自定义模块
const { 
    User, Admin, MallItem, Protocol, 
    ChatMessage, Role, Plan, VoiceLog, DailyTask 
} = require('./models');
const { getLiveWeather, getSolarTerm } = require('./utils');
const ScoringService = require('./services/ScoringService');
const AnalysisService = require('./services/AnalysisService');
const ReminderService = require('./services/ReminderService');
const TaskPolicyService = require('./services/TaskPolicyService');

const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const app = express();

// 公共健康检查接口 (用于部署验证)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
    res.sendStatus(200);
});
const port = process.env.PORT || 3002;

// --- Multer 配置 (用于图片上传) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- 基础配置 ---
const BASE_URI = (process.env.MONGODB_URI?.includes('?') ? process.env.MONGODB_URI.replace(/\?/, 'fivenursing_pro?') : (process.env.MONGODB_URI + 'fivenursing_pro?')) + 'retryWrites=true&w=majority';

app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count'] 
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/ping', (req, res) => {
    res.json({ status: "pong", version: "1.3.0-stable" });
});

const format = (doc) => { 
    if (!doc) return null; 
    const obj = doc.toObject ? doc.toObject({ getters: true }) : doc; 
    const idStr = obj._id ? obj._id.toString() : (obj.id ? obj.id.toString() : null);
    return { ...obj, id: idStr, _id: idStr }; 
};

// --- Helper: Resolve User IDs ---
const resolveUserIds = async (userId) => {
    if (!userId) return [];
    const idList = [userId];
    const user = await User.findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }] }).select('_id firebaseUid').lean();
    if (user) {
        if (user.firebaseUid) idList.push(user.firebaseUid);
        if (user._id) idList.push(user._id.toString());
    }
    return [...new Set(idList)];
};

// --- 业务接口 (优先注册，防止路由冲突) ---

// 用户同步与基本 Profile
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
            phoneNumber: req.body.phoneNumber || "", 
            nickname: '新用户', 
            isProfileComplete: false, 
            createdAt: new Date(),
            scores: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 100, environment: 85 }
        });
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/daily_tasks/generate', async (req, res) => {
    try {
        const { userId, profile, date, commit = false } = req.body;
        if (!userId || !profile) return res.status(400).json({ error: "Missing parameters" });
        const tasks = await TaskPolicyService.generateTasksFromProfile(
            userId, 
            profile, 
            date || getLocalDateString(),
            commit
        );
        res.json(tasks);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) user = await User.findOne({ firebaseUid: req.params.id });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/users/:id', async (req, res) => {
    try {
        let user = await User.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        if (!user) user = await User.findOneAndUpdate({ firebaseUid: req.params.id }, { ...req.body, updatedAt: new Date() }, { new: true });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/:id/calculate-index', async (req, res) => {
    try {
        const result = await ScoringService.calculateIndex(req.params.id);
        res.json({ success: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 自动路由生成器 ---
const createRoutes = (path, Model) => {
  app.get(`/api/${path}`, async (req, res) => {
    try {
      const { _start, _end, _sort, _order, ...filters } = req.query;
      const count = await Model.countDocuments(filters);
      let query = Model.find(filters);
      
      if (_sort) {
        const sortField = _sort === 'id' ? '_id' : _sort;
        query = query.sort({ [sortField]: _order === 'ASC' ? 1 : -1 });
      } else {
        query = query.sort({ createdAt: -1 });
      }

      if (_start !== undefined && _end !== undefined) {
        query = query.skip(parseInt(_start)).limit(parseInt(_end) - parseInt(_start));
      }

      const data = await query.exec();
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
      res.setHeader('X-Total-Count', count);
      res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get(`/api/${path}/:id`, async (req, res) => {
    try { 
      const data = await Model.findById(req.params.id); 
      res.json(format(data)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post(`/api/${path}`, async (req, res) => {
    try { 
      const data = await Model.create({ ...req.body, createdAt: new Date() }); 
      res.json(format(data)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.patch(`/api/${path}/:id`, async (req, res) => {
    try { 
        const updated = await Model.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        res.json(format(updated)); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete(`/api/${path}/:id`, async (req, res) => {
    try { 
      await Model.findByIdAndDelete(req.params.id); 
      res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
};


// --- 核心服务与统计逻辑 ---

// 注册标准 CRUD 路由
createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);
createRoutes('roles', Role);
createRoutes('chatmessages', ChatMessage);
createRoutes('plans', User);
createRoutes('voice_logs', VoiceLog);
// daily_tasks: 自定义 GET（支持 userId 跨格式匹配），其余 CRUD 仍用通用生成器
app.get('/api/daily_tasks', async (req, res) => {
    try {
        const { userId, date, _start, _end, _sort, _order } = req.query;

        let filter = {};
        if (userId) {
            // 宽容匹配：无论 admin 存入 _id 还是 firebaseUid，都能被找到
            const idList = await resolveUserIds(userId);
            filter.userId = { $in: idList };
        }
        if (date) filter.date = date;

        const count = await DailyTask.countDocuments(filter);
        let query = DailyTask.find(filter);

        const sortField = _sort ? (_sort === 'id' ? '_id' : _sort) : 'date';
        query = query.sort({ [sortField]: _order === 'ASC' ? 1 : -1 });

        if (_start !== undefined && _end !== undefined) {
            query = query.skip(parseInt(_start)).limit(parseInt(_end) - parseInt(_start));
        }

        const data = await query.exec();
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.setHeader('X-Total-Count', count);
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// daily_tasks 其他 CRUD（GET /:id, POST, PATCH, DELETE）
app.get('/api/daily_tasks/:id', async (req, res) => {
    try { const data = await DailyTask.findById(req.params.id); res.json(format(data)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/daily_tasks', async (req, res) => {
    try { const data = await DailyTask.create({ ...req.body, createdAt: new Date() }); res.json(format(data)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/daily_tasks/:id', async (req, res) => {
    try { const updated = await DailyTask.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }); res.json(format(updated)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/daily_tasks/:id', async (req, res) => {
    try { await DailyTask.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// 定位与天气 (Utils)
app.post('/api/users/:userId/location', async (req, res) => {
    try {
        const { userId } = req.params;
        const { lat, lng } = req.body;
        const user = await User.findOne({ firebaseUid: userId }) || await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const amapKey = "ce237825915cd4d2837264fdcf0298bc";
        const geoRes = await fetch(`https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}`);
        const geoData = await geoRes.json();

        let adcode = "310000", locationName = "上海市";
        if (geoData?.status === "1" && geoData.regeocode) {
            const addr = geoData.regeocode.addressComponent;
            adcode = addr.adcode || adcode;
            locationName = `${addr.province || ''}${addr.city || ''}${addr.district || ''}`;
        }
        user.locationAdcode = adcode;
        user.locationName = locationName;
        await user.save();

        const weather = await getLiveWeather(adcode);
        res.json({ success: true, locationName, adcode, weather });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI 业务接口 (AnalysisService)
app.post('/api/get-ai-chat-reply', async (req, res) => {
    try {
        const { message, text, profile, history = [] } = req.body;
        const userMessage = message || text;
        const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系提供康养建议...`;
        const reply = await AnalysisService.callAI(userMessage, history, SYSTEM_INSTRUCTION);
        res.json({ reply });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/generate-health-report', async (req, res) => {
    try {
        const report = await AnalysisService.generateHealthReport(req.body.profile);
        res.json({ report });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/diary/summarize', async (req, res) => {
    try {
        const result = await AnalysisService.summarizeDiary(req.body.history, req.body.profile);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 干预与提醒 (ReminderService)
app.post('/api/interventions', async (req, res) => {
    try {
        const { userId, content, category } = req.body;
        const message = await ReminderService.sendIntervention(userId, content, category);
        res.json({ success: true, messageId: message._id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 基础消息接口 (获取历史) - 注意路由顺序：最具体的在前
app.get('/api/messages/unread-count/:userId', async (req, res) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const count = await ChatMessage.countDocuments({ 
            userId: { $in: idList }, 
            isRead: false 
        });
        res.json({ count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/messages/read-all/:userId', async (req, res) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        await ChatMessage.updateMany(
            { userId: { $in: idList }, isRead: false }, 
            { isRead: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { sessionId, before, limit = 20 } = req.query;
        
        const idList = await resolveUserIds(userId);
        const query = { userId: { $in: idList } };
        
        if (sessionId) query.sessionId = sessionId;
        if (before) query.timestamp = { $lt: new Date(before) };

        const msgs = await ChatMessage.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();
        
        res.json(msgs.reverse().map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// 会话管理
app.get('/api/chat/sessions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ $or: [{ firebaseUid: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }] });
        const idList = [userId];
        if (user) {
            if (user.firebaseUid) idList.push(user.firebaseUid);
            idList.push(user._id.toString());
        }

        // 聚合获取所有不重复的 sessionId
        const sessions = await ChatMessage.aggregate([
            { $match: { userId: { $in: [...new Set(idList)] }, sessionId: { $exists: true, $ne: null } } },
            { $sort: { timestamp: -1 } },
            { $group: { 
                _id: "$sessionId", 
                title: { $first: "$sessionTitle" }, 
                lastTimestamp: { $first: "$timestamp" } 
            } },
            { $sort: { lastTimestamp: -1 } },
            { $project: { id: "$_id", title: 1, timestamp: "$lastTimestamp", _id: 0 } }
        ]);
        res.json(sessions);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/chat/sessions/:sid', async (req, res) => {
    try {
        await ChatMessage.deleteMany({ sessionId: req.params.sid });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages', async (req, res) => {
    try {
        const isRead = req.body.role === 'user'; 
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date(), isRead });
        res.json(format(msg));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// 服务启动
console.log("\n>>> [ALIGNMENT V1.3] DailyTask Hub Active <<<");
console.log(`Modular Dev Server running on port ${port}\n`);
app.listen(port);

mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log("MongoDB connected successfully");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

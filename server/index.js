const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// 导入自定义模块
const {
    User, Admin, MallItem, Protocol,
    ChatMessage, Role, Plan, VoiceLog, DailyTask, DailySymptom, TaskTemplate, ScoreHistory, Order
} = require('./models');
const { getLiveWeather, getSolarTerm } = require('./utils');
const ScoringService = require('./services/ScoringService');
const AnalysisService = require('./services/AnalysisService');
const ReminderService = require('./services/ReminderService');
const TaskPolicyService = require('./services/TaskPolicyService');
const ContextService = require('./services/ContextService');
const MemoryService = require('./services/MemoryService');
const GeminiService = require('./services/GeminiService');

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
const DB_NAME = process.env.MONGODB_DB_NAME || (process.env.NODE_ENV === 'production' ? 'fivenursing_pro' : 'fivenursing_dev');
const rawUri = process.env.MONGODB_URI || '';
let BASE_URI = rawUri;

// [ROBUSTNESS] 仅在 URI 不包含数据库路径或查询参数时尝试拼接
if (rawUri && !rawUri.includes('?') && !rawUri.includes(`/${DB_NAME}`)) {
    const separator = rawUri.endsWith('/') ? '' : '/';
    BASE_URI = `${rawUri}${separator}${DB_NAME}?retryWrites=true&w=majority`;
}

console.log(`[DB] Using URI from env: ${BASE_URI.replace(/:([^@]+)@/, ":****@")}`);
console.log(`[DB] Environment: ${process.env.NODE_ENV || 'development'} | Target Database: ${DB_NAME}`);




app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-total-count']
}));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// [DEBUG] Global Request Logger
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url} | Body:`, req.method === 'POST' ? JSON.stringify(req.body).slice(0, 50) : '-');
    next();
});

app.get('/api/ping', (req, res) => {
    res.json({ status: "pong", version: "1.3.0-stable" });
});

const format = (doc) => {
    if (!doc) return null;
    const obj = doc.toObject ? doc.toObject({ getters: true }) : doc;
    const idStr = obj._id ? obj._id.toString() : (obj.id ? obj.id.toString() : null);
    return { ...obj, id: idStr, _id: idStr };
};

// --- Simple In-Memory ID Mapping Cache (To prevent poll-induced DB overload) ---
const idMappingCache = new Map();

const resolveUserIds = async (userId) => {
    if (!userId) return [];
    if (idMappingCache.has(userId)) return idMappingCache.get(userId);

    const idList = [userId];
    const user = await User.findOne({
        $or: [
            { firebaseUid: userId },
            { _id: mongoose.isValidObjectId(userId) ? userId : null }
        ]
    }).select('_id firebaseUid').lean();

    if (user) {
        if (user.firebaseUid) idList.push(user.firebaseUid);
        if (user._id) idList.push(user._id.toString());
    }
    const uniqueIds = [...new Set(idList)];

    // Cache for 1 minute (simple cleanup or just limit map size if needed)
    idMappingCache.set(userId, uniqueIds);
    if (idMappingCache.size > 1000) idMappingCache.clear(); // Simple eviction

    return uniqueIds;
};

// --- Helper: Resolve Primary ID (MongoDB _id) ---
const resolvePrimaryId = async (userId) => {
    const idList = await resolveUserIds(userId);
    // Find the one that looks like a MongoDB ID, otherwise return first
    return idList.find(id => mongoose.isValidObjectId(id)) || userId;
};

// --- Helper: Standardize filtration for Generic Routes ---
const normalizeUserIdFilter = async (query) => {
    const filters = { ...query };
    if (filters.userId) {
        const idList = await resolveUserIds(filters.userId);
        filters.userId = { $in: idList };
    }
    return filters;
};


// --- 管理员登录 ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ error: "管理员不存在" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: "密码错误" });

        const adminObj = format(admin);
        delete adminObj.password;
        res.json({ user: adminObj });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 管理员管理扩展 ---
app.put('/api/admins/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        const admin = await Admin.findById(id);
        if (!admin) return res.status(404).json({ error: "Admin not found" });

        admin.password = password; // 触发 pre-save hook 里的 bcrypt.hash
        await admin.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 业务接口 (优先注册，防止路由冲突) ---
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

// Alias for generating tasks (supports plural/singular)
app.post(['/api/daily_tasks/generate', '/api/daily_task/generate'], async (req, res) => {
    try {
        const { userId, profile, date, commit = false } = req.body;
        if (!userId || !profile) return res.status(400).json({ error: "Missing parameters" });
        const primaryId = await resolvePrimaryId(userId);
        const tasks = await TaskPolicyService.generateTasksFromProfile(
            primaryId,
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

// [COMPAT] 同时支持 /api/user 和 /api/users 
app.post(['/api/user/:id/calculate-index', '/api/users/:id/calculate-index'], async (req, res) => {
    try {
        const result = await ScoringService.calculateIndex(req.params.id);
        res.json({ success: true, ...result });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

    app.get('/api/users/:id/score-history', async (req, res) => {
        try {
            const userId = req.params.id;
            const idList = await resolveUserIds(userId);
            let history = await ScoreHistory.find({ userId: { $in: idList } }).sort({ date: 1 });

            // [NEW] 如果没有历史数据，生成一些模拟数据展示（正式环境数据积累后可移除）
            if (history.length === 0) {
                const mockDays = 14;
                const mockHistory = [];
                const now = new Date();
                for (let i = mockDays; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(now.getDate() - i);
                    mockHistory.push({
                        userId: idList[0],
                        date: date,
                        coreRecoveryIndex: 65 + Math.floor(Math.random() * 20),
                        scores: {
                            diet: 60 + Math.floor(Math.random() * 30),
                            exercise: 50 + Math.floor(Math.random() * 40),
                            sleep: 70 + Math.floor(Math.random() * 20),
                            mental: 65 + Math.floor(Math.random() * 25),
                            function: 55 + Math.floor(Math.random() * 35)
                        }
                    });
                }
                // 暂时只返回模拟数据，不存入数据库，除非需要持久化演示
                history = mockHistory;
            }

            res.json(history.map(format));
        } catch (e) { 
            console.error("Score History API Error:", e);
            res.status(500).json({ error: e.message }); 
        }
    });

// --- 自动路由生成器 ---
const createRoutes = (path, Model) => {
    app.get(`/api/${path}`, async (req, res) => {
        try {
            const { _start, _end, _sort, _order, ...rawFilters } = req.query;
            // [STANDARD] 统一归一化 userId 查询，支持 Firebase UID 和 MongoDB ObjectId 跨格式匹配
            const filters = await normalizeUserIdFilter(rawFilters);

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

// 自定义 daily_symptoms POST 以支持 upsert 和宽容匹配
app.post('/api/daily_symptoms', async (req, res) => {
    try {
        const { userId, date, symptoms } = req.body;
        if (!userId || !date) return res.status(400).json({ error: "Missing userId or date" });

        // [STANDARD] 获取归一化 ID 列表，确保存储时统一使用 Primary ID
        const primaryId = await resolvePrimaryId(userId);
        const idList = await resolveUserIds(userId);

        const data = await DailySymptom.findOneAndUpdate(
            { userId: { $in: idList }, date },
            { $set: { userId: primaryId, symptoms, updatedAt: new Date() } },
            { upsert: true, new: true }
        );
        res.json(format(data));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 自定义 daily_symptoms GET
app.get('/api/daily_symptoms', async (req, res) => {
    try {
        const { userId, date } = req.query;
        let filter = {};
        if (userId) {
            const idList = await resolveUserIds(userId);
            filter.userId = { $in: idList };
        }
        if (date) filter.date = date;
        const data = await DailySymptom.find(filter).sort({ createdAt: -1 });
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 自定义 voice_logs GET
app.get('/api/voice_logs', async (req, res) => {
    try {
        const { userId, date } = req.query;
        let filter = {};
        if (userId) {
            const idList = await resolveUserIds(userId);
            filter.userId = { $in: idList };
        }
        if (date) filter.date = date;
        if (req.query.sessionId) filter.sessionId = req.query.sessionId;
        const data = await VoiceLog.find(filter).sort({ timestamp: -1 });
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 自定义 voice_logs POST
app.post('/api/voice_logs', async (req, res) => {
    try {
        const { userId, date, sessionId, id } = req.body;
        const idList = await resolveUserIds(userId);

        // Use findOneAndUpdate with sessionId if provided to update existing record for that session
        let data;
        const logData = {
            ...req.body,
            userId: idList[0] || userId,
            date: date || getLocalDateString(),
            updatedAt: new Date()
        };

        if (sessionId) {
            data = await VoiceLog.findOneAndUpdate(
                { sessionId },
                { $set: logData },
                { upsert: true, new: true }
            );
        } else if (id || req.body._id) {
            data = await VoiceLog.findByIdAndUpdate(
                id || req.body._id,
                { $set: logData },
                { new: true }
            );
        } else {
            data = await VoiceLog.create({ ...logData, createdAt: new Date() });
        }
        res.json(format(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 自定义 task_templates POST 以支持 upsert
app.post('/api/task_templates', async (req, res) => {
    try {
        const { userId, title } = req.body;
        if (!userId || !title) return res.status(400).json({ error: "Missing userId or title" });
        const data = await TaskTemplate.findOneAndUpdate(
            { userId, title },
            { $set: { ...req.body, updatedAt: new Date() } },
            { upsert: true, new: true }
        );
        res.json(format(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 注册标准 CRUD 路由
// === daily_tasks 自定义路由（含同步逻辑，必须在 createRoutes 之前注册） ===
app.get(['/api/daily_tasks', '/api/daily_task'], async (req, res) => {
    try {
        const { userId, date, dates, _start, _end, _sort, _order } = req.query;
        const primaryId = await resolvePrimaryId(userId);
        const idList = await resolveUserIds(userId);

        let filter = {};
        if (userId) {
            filter.userId = { $in: idList };
        }
        if (date) filter.date = date;
        if (dates && Array.isArray(dates)) filter.date = { $in: dates };

        const sortField = _sort ? (_sort === 'id' ? '_id' : _sort) : 'date';
        const sortOrder = _order === 'ASC' ? 1 : -1;

        // [SYNC] 自动从模板补齐当日任务
        const localDate = getLocalDateString();
        const targetDate = date || localDate;
        const isFutureOrToday = targetDate >= localDate;

        if (primaryId && isFutureOrToday && _start === undefined) {
            const existingCount = await DailyTask.countDocuments({ userId: primaryId, date: targetDate });
            console.log(`[DailyTask] Sync check: user=${primaryId}, date=${targetDate}, existing=${existingCount}`);
            if (existingCount < 2) {
                console.log(`[DailyTask] Triggering template sync for ${primaryId} on ${targetDate}`);
                await TaskPolicyService.generateTasksFromTemplates(primaryId, targetDate);
            }
        }

        // 最终执行查询
        const count = await DailyTask.countDocuments(filter);
        let query = DailyTask.find(filter).sort({ [sortField]: sortOrder });

        if (_start !== undefined && _end !== undefined) {
            query = query.skip(parseInt(_start)).limit(parseInt(_end) - parseInt(_start));
        }

        const data = await query.exec();
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.setHeader('X-Total-Count', count);
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get(['/api/daily_tasks/:id', '/api/daily_task/:id'], async (req, res) => {
    try { const data = await DailyTask.findById(req.params.id); res.json(format(data)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post(['/api/daily_tasks', '/api/daily_task'], async (req, res) => {
    try {
        let data;
        if (req.body.source === 'doctor' || req.body.isManual) {
            data = await TaskPolicyService.addManualTask({ ...req.body, createdAt: new Date() });
        } else {
            data = await DailyTask.create({ ...req.body, createdAt: new Date() });
        }
        res.json(format(data));
    }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch(['/api/daily_tasks/:id', '/api/daily_task/:id'], async (req, res) => {
    try {
        const updated = await DailyTask.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        if (updated && req.body.isInfeasible) {
            // [ALIGNMENT] 如果标记为不可执行，则同步模版状态
            await TaskTemplate.findOneAndUpdate(
                { userId: updated.userId, category: updated.category, title: updated.title },
                { $set: { isInfeasible: true } }
            );
        }
        res.json(format(updated));
    }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete(['/api/daily_tasks/:id', '/api/daily_task/:id'], async (req, res) => {
    try { await DailyTask.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// === 通用 CRUD 路由（daily_tasks 已单独定义，不在此列） ===
createRoutes('users', User);
createRoutes('admins', Admin);
createRoutes('mall_items', MallItem);
createRoutes('protocols', Protocol);
createRoutes('roles', Role);
createRoutes('chatmessages', ChatMessage);
createRoutes('plans', User);
// 核心业务模型：支持单复数别名以增强兼容性
createRoutes('voice_logs', VoiceLog);
createRoutes('voice_log', VoiceLog);
createRoutes('daily_symptoms', DailySymptom);
createRoutes('daily_symptom', DailySymptom);
createRoutes('task_templates', TaskTemplate);
createRoutes('task_template', TaskTemplate);

// --- 订单管理专用路由 ---

// 生成订单号辅助函数
const generateOrderNo = () => {
    const now = new Date();
    const prefix = 'KY';
    const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const timePart = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `${prefix}${datePart}${timePart}${rand}`;
};

// GET /api/orders - 列表（含分页、过滤）
app.get('/api/orders', async (req, res) => {
    try {
        const { _start, _end, _sort, _order, status, userId, expressNo, orderNo } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (userId) filter.userId = { $in: await resolveUserIds(userId) };
        if (expressNo) filter.expressNo = { $regex: expressNo, $options: 'i' };
        if (orderNo) filter.orderNo = { $regex: orderNo, $options: 'i' };

        const count = await Order.countDocuments(filter);
        const sortField = _sort ? (_sort === 'id' ? '_id' : _sort) : 'createdAt';
        let query = Order.find(filter).sort({ [sortField]: _order === 'ASC' ? 1 : -1 });

        if (_start !== undefined && _end !== undefined) {
            query = query.skip(parseInt(_start)).limit(parseInt(_end) - parseInt(_start));
        }
        const data = await query.exec();
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.setHeader('X-Total-Count', count);
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/stats/summary - 订单统计摘要（必须在 /:id 之前注册，否则被动态路由拦截）
app.get('/api/orders/stats/summary', async (req, res) => {
    try {
        const [total, pending, processing, shipped, delivered, cancelled] = await Promise.all([
            Order.countDocuments({}),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'processing' }),
            Order.countDocuments({ status: 'shipped' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' })
        ]);
        res.json({ total, pending, processing, shipped, delivered, cancelled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/orders/:id（动态路由必须在所有静态子路径之后）
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(format(order));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/orders - 创建订单（管理员手动录入）
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            orderNo: req.body.orderNo || generateOrderNo(),
            createdAt: new Date()
        };
        const order = await Order.create(orderData);
        res.json(format(order));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/orders/:id - 通用更新（状态、备注、收货地址等）
app.patch('/api/orders/:id', async (req, res) => {
    try {
        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Order not found' });
        res.json(format(updated));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/orders/:id/shipping - 专用：录入/更新快递单号
app.put('/api/orders/:id/shipping', async (req, res) => {
    try {
        const { expressCompany, expressNo } = req.body;
        if (!expressNo) return res.status(400).json({ error: '快递单号不能为空' });
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                expressCompany: expressCompany || '',
                expressNo,
                expressUpdatedAt: new Date(),
                status: 'shipped',
                shippedAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order: format(order) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/orders/:id/status - 专用：变更订单状态
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status, cancelReason } = req.body;
        const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: '无效的订单状态' });

        const updateData = { status, updatedAt: new Date() };
        if (status === 'cancelled' && cancelReason) updateData.cancelReason = cancelReason;
        if (status === 'paid') updateData.paidAt = new Date();
        if (status === 'delivered') updateData.deliveredAt = new Date();

        const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order: format(order) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/orders/:id
app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
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

// AI 业务接口 (从云函数迁移且已增强稳定性)
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

app.post('/api/get-ai-chat-reply', async (req, res) => {
    try {
        const { message, text, profile, userId, history = [], mode = 'chat', isVoice = false } = req.body;
        const userMessage = (message || text || "").trim();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) return res.status(400).json({ error: "API Key not configured" });

        // 1. 获取增强上下文 (Expert Brain Context)
        const effectiveUserId = userId || profile?.id || profile?.firebaseUid;
        const bioProfile = await ContextService.getFullContext(effectiveUserId);
        const contextFragment = ContextService.buildContextPrompt(bioProfile, userMessage);

        const SYSTEM_INSTRUCTION = mode === 'logging' 
            ? `你是一位温暖、有同理心的康复日记助手。你的任务是帮助用户通过语音记录日记。
主要行为：
1. **倾听并确认**：短小、口语化地表达你在听（如“我听着呢”、“理解您的感受”）。
2. **引导补充**：如果用户说得简单，温和地引导他们多说一点当天的情绪或康复细节。
3. **禁止分析**：不要解释指标、分数或提供医疗建议。
4. **口语化**：直接说出你的回答，不要带标题、格式或标签。`
            : isVoice 
                ? `你是一位专业的肿瘤康复AI教练。基于林洪生“五养”体系（饮食养、运动养、膏方养、心理养、功能养）指导并鼓励患者。

${contextFragment}

回答要求（语音通话专用）：
1. **口语化**：必须非常接地气，像真人在打电话聊天，句子要短。
2. **通俗化**：虽然内容要符合“五养”专业性，但严禁使用专业术语或冗长的医学解释，一定要用大白话。
3. **极简输出**：严禁输出任何 Markdown 格式（如星号、列表）、严禁带 [解释]、[今日行动建议] 等标题标签。只输出纯文本流。
4. **强引导性**：每次回答最后，用一句话自然地提出一个简单开放的问题，引导用户继续聊下去。
5. **严禁冗长**：每次回答控制在 3-4 个短句内。`
                : `你是一位专业的肿瘤康复AI教练。
核心理论体系：林洪生“五养”体系（饮食养、运动养、膏方养、心理养、功能养）。

${contextFragment}

回答要求：
1. 严谨性：所有建议必须符合上述“五养”关联背景。
2. 个性化：必须根据[患者全维画像]中的得分和今日执行状态进行精准回复。
3. 交互引导：在回复正文结束时，必须添加 [SUGGESTIONS] 标签，生成 3 条用户可能想问的后续问题（用 | 分隔），例如：[SUGGESTIONS] 为什么建议我增加运动量？ | 我该如何改善睡眠质量？ | 给我的饮食建议。
4. 安全守则：不代替诊断，发现危险信号建议就医，最后带免责声明。
5. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。`;

        const messages = [
            { role: "system", content: SYSTEM_INSTRUCTION },
        ];

        // 统一角色标签，并确保 user/assistant 交替出现
        let lastRole = 'system';
        history.filter(h => h.text && h.text.trim()).forEach(h => {
            const role = h.role === 'model' ? 'assistant' : 'user';
            if (role !== lastRole) {
                messages.push({ role, content: h.text.trim() });
                lastRole = role;
            }
        });

        if (userMessage) {
            if (userMessage === '[SYSTEM_START_VOICE]') {
                const greetingContext = mode === 'logging' 
                    ? `[这是一条系统指令，因为用户刚接通了语音日记功能。请立刻用简短亲切的一句话向用户打个招呼，问候一下今天的康复感受，引导他们开始诉说日记。]`
                    : `[这是一条系统指令，因为用户刚接通了语音通话。请基于你们之前的聊天上下文，用简短自然、像电话聊天一样的口吻打个招呼，表示你在听。]`;
                messages.push({ role: "system", content: greetingContext });
            } else {
                if (lastRole === 'user') {
                    messages[messages.length - 1].content += "\n" + userMessage;
                } else {
                    messages.push({ role: "user", content: userMessage });
                }
            }
        } else {
            return res.status(400).json({ error: "Message content cannot be empty" });
        }

        const models = ["google/gemini-3-flash-preview", "qwen/qwen-2.5-72b-instruct"];
        let reply = "";
        let attemptError = null;

        for (const model of models) {
            try {
                console.log(`[AI] Attempting with model: ${model}`);
                const response = await fetch(OPENROUTER_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "X-Title": "FiveNursings-ExpertBrain"
                    },
                    body: JSON.stringify({ model, messages })
                });

                if (response.ok) {
                    const data = await response.json();
                    reply = data.choices?.[0]?.message?.content;
                    if (reply) break;
                } else {
                    const err = await response.json().catch(() => ({}));
                    console.warn(`[AI] Model ${model} failed with ${response.status}`, err);
                    attemptError = err;
                }
            } catch (e) {
                console.error(`[AI] Network error for model ${model}`, e);
                attemptError = e;
            }
        }

        if (!reply) {
            console.error("[AI] All models failed or rate limited.");
            // 鲁棒性改进：如果所有模型都挂了，返回一个 200 的优雅道歉，避免客户端显示“网络错误”
            return res.json({
                reply: "抱歉，五养专家大脑目前正忙（由于访问量较大），请您稍等几分钟再试。在这期间，您可以先查看下方的今日康复建议。"
            });
        }

        // 2. 异步执行画像提取 (AI gets to know you better)
        if (effectiveUserId && bioProfile) {
            MemoryService.extractNewInsights(userMessage, reply, bioProfile.aiInsights)
                .then(newInsights => {
                    if (newInsights.length !== bioProfile.aiInsights.length) {
                        User.findOneAndUpdate(
                            { $or: [{ firebaseUid: effectiveUserId }, { _id: mongoose.Types.ObjectId.isValid(effectiveUserId) ? effectiveUserId : null }] },
                            { $set: { aiInsights: newInsights } }
                        ).then(() => console.log(`[Memory] Insights updated for ${effectiveUserId}`));
                    }
                })
                .catch(err => console.error("[Memory] Failed to extract insights:", err));
        }

        let audio = null;
        if (reply && isVoice) {
            try {
                // Remove markdown before sending to TTS
                const cleanTextForVoice = reply
                    .replace(/[#*`~>]/g, '')
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
                    .replace(/-/g, ' ')
                    .replace(/\t/g, ' ')
                    .trim();
                audio = await GeminiService.generateAudio(cleanTextForVoice, profile?.voicePreference || 'Kore');
            } catch (ttsErr) {
                console.error("[AI] TTS Generation failed:", ttsErr);
            }
        }

        res.json({ reply, audio });
    } catch (e) {
        console.error("[AI Server Error]", e);
        res.json({ reply: "抱歉，五养专家正在休息中，请稍后再试。" });
    }
});

app.post('/api/generate-health-report', async (req, res) => {
    try {
        const userId = req.body.userId || req.body.profile?.id;
        const result = await AnalysisService.generateHealthReport(userId, req.body.profile);
        res.json(result);
    } catch (e) {
        console.error('[HealthReport API Error]', e.stack || e);
        res.status(500).json({ error: e.message });
    }
});

// Used for Voice Settings Preview
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) return res.status(400).json({ error: "Missing text" });
        const audio = await GeminiService.generateAudio(text, voice || 'Kore');
        res.json({ audio });
    } catch (e) {
        console.error('[TTS API Error]', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/diary/summarize', async (req, res) => {
    try {
        const result = await AnalysisService.summarizeDiary(req.body.history, req.body.profile);
        res.json(result);
    } catch (e) {
        console.error("[Summarize API Error]", e);
        res.status(500).json({ error: e.message });
    }
});

// --- OpenClaw: 全维上下文接口 ---
app.get('/api/users/:userId/full-context', async (req, res) => {
    try {
        const { userId } = req.params;
        const idList = await resolveUserIds(userId);

        // 1. 获取用户档案
        const user = await User.findOne({
            $or: [{ firebaseUid: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }]
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        const userObj = user.toObject ? user.toObject({ getters: true }) : user;

        // 2. 获取最近 5 条 AI 对话记录
        const recentMessages = await ChatMessage.find({
            userId: { $in: idList }
        }).sort({ timestamp: -1 }).limit(5);

        // 3. 环境数据 (使用本地 utils)
        const adcode = userObj.locationAdcode || "310000";
        const weather = await getLiveWeather(adcode);
        const solarTerm = getSolarTerm();

        const environment = {
            location: userObj.locationName || "上海市",
            time: new Date().toISOString(),
            solarTerm,
            weather: weather.weather,
            temperature: weather.temperature,
            humidity: weather.humidity,
            airQuality: "优",
            altitude: 15
        };

        // 4. 体征数据
        const weight = userObj.weight || userObj.questionnaire?.weight;
        const height = userObj.height || userObj.questionnaire?.height;
        const bmi = (weight && height) ? (weight / Math.pow(height / 100, 2)).toFixed(1) : "未知";

        const vitals = {
            bmi,
            heartRate: userObj.wearable?.isConnected ? "72 bpm" : "未监测 (建议接入设备)",
            stepsToday: userObj.wearable?.isConnected ? "3420" : "待同步",
            sleepQuality: (userObj.scores?.sleep > 80) ? "良好" : "需调优",
            lastBloodPressure: "近期未记录",
            bodyTemperature: "36.6℃ (档案记录)"
        };

        // 5. 依从性
        const scores = userObj.scores || { diet: 80, exercise: 80, sleep: 80, mental: 80, function: 80 };
        const avgScore = Math.round((scores.diet + scores.exercise + scores.sleep + scores.mental + scores.function) / 5);
        const missedTasks = [];
        if (scores.exercise < 70) missedTasks.push("每日适度户外活动");
        if (scores.mental < 70) missedTasks.push("晚间正念冥想");

        const adherence = {
            completionRate: `${avgScore}%`,
            missedTasks: missedTasks.length > 0 ? missedTasks : ["暂无明显遗漏"]
        };

        // 6. 康复背景指引
        const lastMedicalOrder = `患者处于${userObj.cancerType || '康复'}${userObj.stage || ''}阶段。当前康复重点：维持${avgScore}%以上的依从水平，重点关注${scores.diet < 70 ? '饮食营养' : '身体平衡'}与心理状态。`;

        res.json({
            profile: format(user),
            recentMessages: recentMessages.map(format),
            environment,
            vitals,
            adherence,
            lastMedicalOrder
        });
    } catch (e) {
        console.error("[FullContext Error]", e);
        res.status(500).json({ error: e.message });
    }
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
app.get('/api/messages/latest-unread-intervention/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const idList = await resolveUserIds(userId);
        const latestIntervention = await ChatMessage.findOne({
            userId: { $in: idList },
            type: 'intervention',
            isRead: false
        }).sort({ timestamp: -1 }).lean();

        res.json({ sessionId: latestIntervention ? latestIntervention.sessionId : null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
            {
                $group: {
                    _id: "$sessionId",
                    title: { $first: "$sessionTitle" },
                    lastTimestamp: { $first: "$timestamp" }
                }
            },
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

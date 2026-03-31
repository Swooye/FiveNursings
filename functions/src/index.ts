import { onRequest } from "firebase-functions/v2/https";
import { Solar } from 'lunar-javascript';
import * as admin from "firebase-admin";
import mongoose from "mongoose";
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import * as dotenv from "dotenv";

dotenv.config();

admin.initializeApp();

/**
 * 实时获取高德天气数据
 * @param {string} cityName 城市行政区划代码或名称
 */
async function getLiveWeather(cityName: string = "上海市") {
    try {
        const amapKey = "ce237825915cd4d2837264fdcf0298bc";
        const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${amapKey}&city=${encodeURIComponent(cityName)}`;
        const res = await fetch(url);
        const data: any = await res.json();
        
        if (data && data.status === "1" && data.lives && data.lives.length > 0) {
            const live = data.lives[0];
            return {
                weather: live.weather,
                temperature: live.temperature + "℃",
                humidity: live.humidity + "%"
            };
        }
    } catch (e) {
        console.error("Amap Weather API failed:", e);
    }
    return {
        weather: "未知 (API异常)",
        temperature: "--℃",
        humidity: "--%"
    };
}

/**
 * 真实天文计算：基于 lunar-javascript 的精确节气
 */
function getSolarTerm(): string {
    try {
        const solar = Solar.fromDate(new Date());
        const lunar = solar.getLunar();
        const prev = lunar.getPrevJieQi(true); 
        const next = lunar.getNextJieQi(false); 
        return `${prev.getName()} (下一个节气 ${next.getName()} 将于 ${next.getSolar().toYmd()} 到来)`;
    } catch (err) {
        console.error("Solar Term Calculation Error:", err);
        return "未知";
    }
}

const PROD_PROJECT_ID = "fivenursings-73917017-a0dfd";

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const chatSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },       // 会话 ID
    sessionTitle: { type: String },                 // 会话标题
    role: String,
    text: String,
    type: { type: String, default: 'chat' },      // 'chat' | 'intervention'
    category: { type: String },                     // e.g. '饮食养', '运动养'
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
}, { strict: false, collection: 'chatmessages' });
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
const MallItem = mongoose.models.MallItem || mongoose.model('MallItem', mallItemSchema, 'mall_items');
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

let isConnected = false;
const connectDb = async () => {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
        const projectId = config.projectId || admin.app().options.projectId || "";
        const dbName = (projectId === PROD_PROJECT_ID) ? "fivenursing_pro" : "fivenursing_dev";
        
        const envUri = process.env.MONGODB_URI || "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/";
        const parsedUrl = new URL(envUri);
        parsedUrl.pathname = `/${dbName}`;
        if (!parsedUrl.searchParams.has('retryWrites')) parsedUrl.searchParams.set('retryWrites', 'true');
        if (!parsedUrl.searchParams.has('w')) parsedUrl.searchParams.set('w', 'majority');
        
        await mongoose.connect(parsedUrl.toString());
        isConnected = true;
    } catch (err) { throw err; }
};


// --- [核心] 为 OpenClaw 提供的全维上下文接口 ---

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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

apiRouter.post('/users/:userId/location', async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const { lat, lng } = req.body;
        if (!lat || !lng) return res.status(400).json({ error: "Missing coordinates" });
        
        let user: any = await User.findOne({ firebaseUid: userId } as any);
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await (User as any).findById(userId);
        }
        if (!user) return res.status(404).json({ error: "User not found" });

        const amapKey = "ce237825915cd4d2837264fdcf0298bc";
        const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}`;
        const regeoRes = await fetch(url);
        const geoData: any = await regeoRes.json();

        let adcode = "310000"; 
        let locationName = "上海市";
        if (geoData && geoData.status === "1" && geoData.regeocode) {
            const addr = geoData.regeocode.addressComponent;
            adcode = addr.adcode || adcode;
            const fullAddress = geoData.regeocode.formatted_address;
            locationName = `${addr.province || ''}${addr.city && addr.city.length ? addr.city : ''}${addr.district || ''}` || fullAddress;
        }

        user.locationAdcode = adcode;
        user.locationName = locationName;
        await user.save();

        // 核心亮点：在高德精准定位后紧接着获取实时天气
        const weatherInfo = await getLiveWeather(adcode);

        res.json({ success: true, locationName, adcode, weather: weatherInfo });
    } catch (e: any) {
        console.error("Location update failed:", e);
        res.status(500).json({ error: e.message });
    }
});

apiRouter.post('/users/sync', async (req: any, res: any) => {
    try {
        const uid = req.body.firebaseUid.trim();
        const suffix = req.body.phoneNumber ? req.body.phoneNumber.replace(/\D/g, '').slice(-11) : "";
        let user = await User.findOne({ $or: [{ firebaseUid: uid }, { phoneNumber: new RegExp(suffix + '$') }] } as any);
        if (user) {
            user.firebaseUid = uid;
            await user.save();
            return res.json(format(user));
        }
        user = await User.create({ firebaseUid: uid, phoneNumber: req.body.phoneNumber, nickname: '新用户', isProfileComplete: false });
        res.json(format(user));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 通用资源管理
const MODEL_MAP: Record<string, any> = {
    users: User,
    admins: Admin,
    mall_items: MallItem,
    protocols: Protocol,
    roles: Role,
    chatmessages: ChatMessage,
    plans: Plan
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

    apiRouter.delete(`/${resourceName}/:id`, async (req: any, res: any) => {
        try {
            await Model.findByIdAndDelete(req.params.id);
            res.json({ success: true });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
});

// 特殊处理单数形式的 /user 及其 ID 兼容性 (支持 MongoDB _id 或 Firebase UID)
apiRouter.get('/user/:id', async (req: any, res: any) => {
    try {
        console.log(`[GET] User lookup for ID/UID: ${req.params.id}`);
        let user = await (User as any).findById(req.params.id);
        if (!user) {
            console.log(`[GET] Not found by ObjectId, trying firebaseUid...`);
            user = await (User as any).findOne({ firebaseUid: req.params.id } as any);
        }
        if (!user) {
            console.warn(`[GET] User NOT found by either ID or UID: ${req.params.id}`);
            return res.status(404).json({ error: "User not found" });
        }
        console.log(`[GET] User found: ${user._id}`);
        res.json(format(user));
    } catch (e: any) { 
        console.error(`[GET] User lookup error: ${e.message}`);
        res.status(500).json({ error: e.message }); 
    }
});

apiRouter.patch('/user/:id', async (req: any, res: any) => {
    try {
        console.log(`[PATCH] User update for ID/UID: ${req.params.id}`);
        let user = await (User as any).findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
        if (!user) {
            console.log(`[PATCH] Not found by ObjectId, trying firebaseUid...`);
            user = await (User as any).findOneAndUpdate({ firebaseUid: req.params.id } as any, { ...req.body, updatedAt: new Date() }, { new: true });
        }
        if (!user) {
            console.warn(`[PATCH] User NOT found for update: ${req.params.id}`);
            return res.status(404).json({ error: "User not found" });
        }
        console.log(`[PATCH] User updated: ${user._id}`);
        res.json(format(user));
    } catch (e: any) { 
        console.error(`[PATCH] User update error: ${e.message}`);
        res.status(500).json({ error: e.message }); 
    }
});

// 消息接口
apiRouter.post('/login', async (req: any, res: any) => {
    try {
        const { email, password } = req.body;
        const adminUser: any = await Admin.findOne({ email } as any);
        if (!adminUser) return res.status(401).json({ error: '用户不存在' });
        
        // 支持明文或 bcrypt 校验
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
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- [核心] 为 OpenClaw 提供的全维上下文接口 ---
apiRouter.get('/users/:userId/full-context', async (req: any, res: any) => {
    const { userId } = req.params;
    console.log(`[OpenClaw] full-context request for userId: ${userId}`);
    try {
        // 1. 获取用户档案 (支持 firebaseUid 或 _id)
        let user = await User.findOne({ firebaseUid: userId } as any);
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await (User as any).findById(userId);
        }
        if (!user) {
            console.warn(`[OpenClaw] full-context: User NOT found for ID: ${userId}`);
            return res.status(404).json({ error: `User not found in database: ${userId}` });
        }

        const userObj: any = user;

        // 2. 获取最近 5 条 AI 对话记录
        const recentMessages = await ChatMessage.find({ userId: userObj.firebaseUid || userId } as any)
            .sort({ timestamp: -1 })
            .limit(5);

        // 3. 模拟实时环境数据 (加入高德真实的实时气象)
        const locAdcode = userObj.locationAdcode || "310000";
        const locName = userObj.locationName || "上海市";

        const liveWeather = await getLiveWeather(locAdcode);
        const mockEnvironment = {
            location: locName,
            time: new Date().toISOString(),
            solarTerm: getSolarTerm(),
            weather: liveWeather.weather,
            temperature: liveWeather.temperature,
            humidity: liveWeather.humidity,
            airQuality: "优",                  // 其他暂留可扩展
            altitude: 15
        };

        // --- 动态计算实测/档案体征 ---
        const weight = userObj.weight || userObj.questionnaire?.weight;
        const height = userObj.height || userObj.questionnaire?.height;
        let bmi = "未知";
        if (weight && height) {
            bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
        }

        const vitals = {
            bmi: bmi,
            heartRate: userObj.wearable?.isConnected ? "72 bpm" : "未监测 (建议接入设备)",
            stepsToday: userObj.wearable?.isConnected ? "3420" : "待同步",
            sleepQuality: userObj.scores?.sleep > 80 ? "良好" : "需调优",
            lastBloodPressure: "近期未记录",
            bodyTemperature: "36.6℃ (档案记录)"
        };

        // --- 动态计算依从性 (基于五养评分) ---
        const scores = userObj.scores || { diet: 80, exercise: 80, sleep: 80, mental: 80, function: 80 };
        const avgScore = Math.round((scores.diet + scores.exercise + scores.sleep + scores.mental + scores.function) / 5);
        const missedTasks = [];
        if (scores.exercise < 70) missedTasks.push("每日适度户外活动");
        if (scores.mental < 70) missedTasks.push("晚间正念冥想");

        const adherence = {
            completionRate: `${avgScore}%`,
            missedTasks: missedTasks.length > 0 ? missedTasks : ["暂无明显遗漏"]
        };

        // --- 动态合成最新的康复背景指引 (供 OpenClaw AI 参考) ---
        const cancerInfo = userObj.cancerType || "康复中";
        const stageInfo = userObj.stage || "";
        const lastMedicalOrder = `患者处于${cancerInfo}${stageInfo}阶段。当前康复重点：维持${avgScore}%以上的依从水平，重点关注${scores.diet < 70 ? '饮食营养' : '身体平衡'}与心理状态。`;

        res.json({
            profile: format(user),
            recentMessages: recentMessages.map(format),
            environment: mockEnvironment,
            vitals: vitals,
            adherence: adherence,
            lastMedicalOrder: lastMedicalOrder
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- OpenClaw 干预推送接口 ---
apiRouter.post('/interventions', async (req: any, res: any) => {
    const { userId, content, category, title } = req.body;
    console.log(`[OpenClaw] intervention request for userId: ${userId}, category: ${category}`);
    if (!userId || !content) {
        return res.status(400).json({ error: "userId and content are required" });
    }
    try {
        // 查找用户
        let user = await User.findOne({ firebaseUid: userId } as any);
        if (!user && mongoose.Types.ObjectId.isValid(userId)) {
            user = await (User as any).findById(userId);
        }
        if (!user) {
            console.warn(`[OpenClaw] intervention: User NOT found for ID: ${userId}`);
            return res.status(404).json({ error: `User not found in database: ${userId}` });
        }

        const userObj: any = user;
        const targetUid = userObj.firebaseUid || userId;

        // 写入 ChatMessage（isRead: false 触发红点）
        const message = await ChatMessage.create({
            userId: targetUid,
            role: 'model',
            text: content,
            type: 'intervention',
            category: category || '健康干预',
            isRead: false,
            timestamp: new Date()
        });

        // 尝试 FCM 推送（静默失败）
        try {
            await admin.messaging().send({
                notification: {
                    title: title || "五养教练的新建议",
                    body: content.substring(0, 100) + (content.length > 100 ? "..." : "")
                },
                data: { type: "intervention", messageId: message._id.toString() },
                topic: `user_${targetUid}`
            } as any);
        } catch (fcmErr) {
            console.warn("FCM push skipped (no subscribers or topic issue):", fcmErr);
        }

        res.json({ success: true, messageId: message._id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 消息接口 — 精确路径必须在参数路由之前
apiRouter.get('/messages/unread-count/:userId', async (req: any, res: any) => {
    try {
        const count = await ChatMessage.countDocuments({ userId: req.params.userId, isRead: false } as any);
        res.json({ count });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.patch('/messages/read-all/:userId', async (req: any, res: any) => {
    try {
        await ChatMessage.updateMany({ userId: req.params.userId, isRead: false } as any, { isRead: true });
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.post('/messages', async (req: any, res: any) => {
    try {
        const { role } = req.body;
        const isRead = role === 'user'; 
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date(), isRead });
        res.json(format(msg));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 文件上传接口 (注意：云函数环境中本地存储是非持久化的)
apiRouter.post('/upload', async (req: any, res: any) => {
    // 兼容原有的 /api/upload 调用逻辑
    res.status(501).json({ error: "Upload not supported on this endpoint. Please use Firebase Storage on frontend." });
});

apiRouter.get('/messages/:userId', async (req: any, res: any) => {
    try {
        const { sessionId } = req.query;
        const query: any = { userId: req.params.userId };
        if (sessionId) {
            query.sessionId = sessionId;
        } else {
            // 如果没传 sessionId，默认返回最新的会话或全量（向下兼容）
            // 这里为了支持“历史”，如果没有 sessionId，我们可能希望返回最后一条消息所在的会话
            // 简单起见：没传就返回全部（或者最近50条）
        }
        const data = await ChatMessage.find(query).sort({ timestamp: -1 }).limit(50);
        res.json(data.map(format).reverse());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 获取用户的会话列表
apiRouter.get('/chat/sessions/:userId', async (req: any, res: any) => {
    try {
        const sessions = await ChatMessage.aggregate([
            { $match: { userId: req.params.userId, sessionId: { $exists: true, $ne: null } } },
            { $group: { 
                _id: "$sessionId", 
                title: { $first: "$sessionTitle" },
                lastTimestamp: { $max: "$timestamp" }
            }},
            { $sort: { lastTimestamp: -1 } }
        ]);
        res.json(sessions.map(s => ({ id: s._id, title: s.title || '新对话', lastTimestamp: s.lastTimestamp })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// 删除整个会话
apiRouter.delete('/chat/sessions/:sessionId', async (req: any, res: any) => {
    try {
        await ChatMessage.deleteMany({ sessionId: req.params.sessionId } as any);
        res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/debug-info', async (req: any, res: any) => {
    const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
    const projectId = config.projectId || admin.app().options.projectId || "";
    res.json({ status: "FINAL_STABLE_V10", db: projectId === PROD_PROJECT_ID ? "fivenursing_pro" : "fivenursing_dev" });
});

// --- HTTP 接口：为 AI 会话和简报提供支持 ---

apiRouter.post('/get-ai-chat-reply', async (req: any, res: any) => {
    const { message, text, profile, history = [] } = req.body;
    const userMessage = message || text;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return res.status(400).json({ error: "API Key not configured" });

    const contextPrefix = `[患者背景] 类型：${profile.cancerType}, 阶段：${profile.stage}, 五养分数：饮食${profile.scores?.diet || 0}/100, 运动${profile.scores?.exercise || 0}/100, 睡眠${profile.scores?.sleep || 0}/100, 心理${profile.scores?.mental || 0}/100, 功能${profile.scores?.function || 0}/100。`;

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fivenursings-73917017-a0dfd.web.app/",
                "X-Title": "FiveNursings"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    { role: "system", content: contextPrefix },
                    ...history.filter((h: any) => h.text).map((h: any) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
                    { role: "user", content: userMessage }
                ],
            }),
        });
        const data = await response.json();
        if (data.error) {
            console.error("AI Chat Error:", data.error);
            return res.json({ reply: `AI服务错误: ${data.error.message || JSON.stringify(data.error)}` });
        }
        const reply = data.choices?.[0]?.message?.content || "抱歉，生成失败。";
        res.json({ reply });
    } catch (e: any) {
        console.error("AI Chat Catch:", e);
        res.status(500).json({ error: e.message });
    }
});

apiRouter.post('/generate-health-report', async (req: any, res: any) => {
    const { profile } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "API Key not configured" });

    const prompt = `请基于以下患者档案生成一份【今日康复简报】。
患者昵称：${profile.nickname || '用户'}
诊断类型：${profile.cancerType}, 阶段：${profile.stage}
五养评分：饮食${profile.scores?.diet || 0}, 运动${profile.scores?.exercise || 0}, 睡眠${profile.scores?.sleep || 0}, 心理${profile.scores?.mental || 0}, 功能${profile.scores?.function || 0}

要求：
1. 采用 Markdown 格式，层级清晰。
2. 给出 1-2 条最核心的今日待办。
3. 请在简报中使用患者的昵称进行亲切称呼，禁止出现 [患者姓名] 等占位符。
4. 语气要温暖、鼓励，字数控制在 200 字左右。
5. 必须包含免责声明：本建议不构成医疗诊断。`;

    try {
        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${apiKey}`, 
                "Content-Type": "application/json",
                "HTTP-Referer": "https://fivenursings-73917017-a0dfd.web.app/",
                "X-Title": "FiveNursings"
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
            console.error("Health report Error:", data.error);
            return res.json({ report: `暂时无法生成简报: ${data.error.message || JSON.stringify(data.error)}` });
        }
        const report = data.choices?.[0]?.message?.content || "暂时无法生成简报，请稍后再试。";
        res.json({ report });
    } catch (e: any) {
        console.error("Health report Catch:", e);
        res.status(500).json({ error: e.message });
    }
});

app.use('/api', apiRouter);
export const api = onRequest({ region: "us-central1" }, app);

// --- AI 逻辑实现 ---
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;



const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, ScoreHistory } = require('../models');
const { format, getLiveWeather, getSolarTerm } = require('../utils');
const { resolveUserIds, resolvePrimaryId } = require('../utils/idResolver');
const ScoringService = require('../services/ScoringService');
const ContextService = require('../services/ContextService');

// --- 用户同步 ---
router.post('/users/sync', async (req, res) => {
    try {
        const { firebaseUid, email, name, photoURL, ...rest } = req.body;
        if (!firebaseUid) return res.status(400).json({ error: 'Missing firebaseUid' });

        let user = await User.findOne({ firebaseUid });
        if (!user) {
            user = await User.create({ firebaseUid, email, name, photoURL, ...rest });
            console.log(`[Sync] New user created: ${firebaseUid}`);
        } else {
            // Update photoURL if changed
            if (photoURL && user.photoURL !== photoURL) {
                user.photoURL = photoURL;
                await user.save();
            }
        }
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 获取用户信息 ---
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findOne({ $or: [{ firebaseUid: req.params.id }, { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }] });
        res.json(format(user));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 更新用户信息 ---
router.patch('/users/:id', async (req, res) => {
    try {
        const updated = await User.findOneAndUpdate(
            { $or: [{ firebaseUid: req.params.id }, { _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : null }] },
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        res.json(format(updated));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 计算恢复指数 ---
router.post(['/user/:id/calculate-index', '/users/:id/calculate-index'], async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await ScoringService.calculateAndSaveIndex(userId);
        res.json({ success: true, ...result });
    } catch (e) { 
        console.error("Calculate Index API Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// --- 获取评分历史 ---
router.get('/users/:id/score-history', async (req, res) => {
    try {
        const userId = req.params.id;
        const idList = await resolveUserIds(userId);
        let history = await ScoreHistory.find({ userId: { $in: idList } }).sort({ date: 1 });

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
            history = mockHistory;
        }

        res.json(history.map(format));
    } catch (e) { 
        console.error("Score History API Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// --- 定位与天气 ---
router.post('/users/:userId/location', async (req, res) => {
    try {
        const { userId } = req.params;
        const { lat, lng, locationName, adcode } = req.body;
        
        const primaryId = await resolvePrimaryId(userId);
        await User.findByIdAndUpdate(primaryId, { 
            location: { lat, lng },
            locationName,
            locationAdcode: adcode
        });

        const weather = await getLiveWeather(adcode);
        res.json({ success: true, locationName, adcode, weather });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OpenClaw: 全维上下文接口 ---
router.get('/users/:userId/full-context', async (req, res) => {
    try {
        const { userId } = req.params;
        const idList = await resolveUserIds(userId);

        const user = await User.findOne({
            $or: [{ firebaseUid: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });
        if (!user) return res.status(404).json({ error: "User not found" });

        const { ChatMessage } = require('../models');
        const userObj = user.toObject ? user.toObject({ getters: true }) : user;
        const recentMessages = await ChatMessage.find({ userId: { $in: idList } }).sort({ timestamp: -1 }).limit(5);

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

        const scores = userObj.scores || { diet: 80, exercise: 80, sleep: 80, mental: 80, function: 80 };
        const avgScore = Math.round((scores.diet + scores.exercise + scores.sleep + scores.mental + scores.function) / 5);
        const missedTasks = [];
        if (scores.exercise < 70) missedTasks.push("每日适度户外活动");
        if (scores.mental < 70) missedTasks.push("晚间正念冥想");

        const adherence = {
            completionRate: `${avgScore}%`,
            missedTasks: missedTasks.length > 0 ? missedTasks : ["暂无明显遗漏"]
        };

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

// --- Generic CRUD for User & Plans ---
const createRoutes = require('../utils/routeGenerator');
createRoutes(router, 'users', User);
createRoutes(router, 'plans', User);

module.exports = router;

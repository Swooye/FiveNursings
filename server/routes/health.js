const express = require('express');
const router = express.Router();
const { DailySymptom, VoiceLog, TaskTemplate } = require('../models');
const { format, getLocalDateString } = require('../utils');
const { resolveUserIds, resolvePrimaryId } = require('../utils/idResolver');

// --- 每日症状 (Daily Symptoms) ---
router.post('/daily_symptoms', async (req, res) => {
    try {
        const { userId, date, symptoms } = req.body;
        if (!userId || !date) return res.status(400).json({ error: "Missing userId or date" });

        const primaryId = await resolvePrimaryId(userId);
        const idList = await resolveUserIds(userId);

        const data = await DailySymptom.findOneAndUpdate(
            { userId: { $in: idList }, date },
            { $set: { userId: primaryId, symptoms, updatedAt: new Date() } },
            { upsert: true, new: true }
        );
        res.json(format(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/daily_symptoms', async (req, res) => {
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

// --- 语音日志 (Voice Logs) ---
router.get('/voice_logs', async (req, res) => {
    try {
        const { userId, date, sessionId } = req.query;
        let filter = {};
        if (userId) {
            const idList = await resolveUserIds(userId);
            filter.userId = { $in: idList };
        }
        if (date) filter.date = date;
        if (sessionId) filter.sessionId = sessionId;
        const data = await VoiceLog.find(filter).sort({ timestamp: -1 });
        res.json(data.map(format));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/voice_logs', async (req, res) => {
    try {
        const { userId, date, sessionId, id } = req.body;
        const idList = await resolveUserIds(userId);

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

// --- 任务模板 (Task Templates) ---
router.post('/task_templates', async (req, res) => {
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

const createRoutes = require('../utils/routeGenerator');

// --- Generic CRUD for Health Models ---
createRoutes(router, 'daily_symptoms', DailySymptom);
createRoutes(router, 'daily_symptom', DailySymptom);
createRoutes(router, 'voice_logs', VoiceLog);
createRoutes(router, 'voice_log', VoiceLog);
createRoutes(router, 'task_templates', TaskTemplate);
createRoutes(router, 'task_template', TaskTemplate);

module.exports = router;

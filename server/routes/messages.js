const express = require('express');
const router = express.Router();
const { ChatMessage } = require('../models');
const { format } = require('../utils');
const { resolveUserIds } = require('../utils/idResolver');
const createRoutes = require('../utils/routeGenerator');

// --- 获取对话历史 (聚合 sessions) ---
router.get('/chat/sessions/:userId', async (req, res) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const sessions = await ChatMessage.aggregate([
            { $match: { userId: { $in: idList }, sessionId: { $exists: true, $ne: null } } },
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

router.delete('/chat/sessions/:sid', async (req, res) => {
    try {
        await ChatMessage.deleteMany({ sessionId: req.params.sid });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 未读消息统计 ---
router.get('/messages/latest-unread-intervention/:userId', async (req, res) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const latest = await ChatMessage.findOne({
            userId: { $in: idList },
            type: 'intervention',
            isRead: false
        }).sort({ timestamp: -1 }).lean();
        res.json({ sessionId: latest ? latest.sessionId : null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/messages/unread-count/:userId', async (req, res) => {
    try {
        const idList = await resolveUserIds(req.params.userId);
        const count = await ChatMessage.countDocuments({
            userId: { $in: idList },
            isRead: false
        });
        res.json({ count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 标记已读 ---
router.patch('/messages/:id/read', async (req, res) => {
    try {
        await ChatMessage.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 创建消息 (自定义逻辑) ---
router.post('/messages', async (req, res) => {
    try {
        const isRead = req.body.role === 'user';
        const msg = await ChatMessage.create({ ...req.body, timestamp: new Date(), isRead });
        res.json(format(msg));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Generic CRUD for ChatMessage ---
createRoutes(router, 'chatmessages', ChatMessage);

module.exports = router;

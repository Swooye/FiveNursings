const express = require('express');
const router = express.Router();
const { DailyTask } = require('../models');
const { format, getLocalDateString } = require('../utils');
const { resolveUserIds, resolvePrimaryId } = require('../utils/idResolver');
const TaskPolicyService = require('../services/TaskPolicyService');

// --- 任务生成 (手动触发同步) ---
router.post(['/daily_tasks/generate', '/daily_task/generate'], async (req, res) => {
    try {
        const { userId, date } = req.body;
        if (!userId) return res.status(400).json({ error: "Missing userId" });
        
        const targetDate = date || getLocalDateString();
        const primaryId = await resolvePrimaryId(userId);
        
        console.log(`[TaskPolicy] Manual trigger for user ${primaryId} on ${targetDate}`);
        const tasks = await TaskPolicyService.generateTasksFromTemplates(primaryId, targetDate);
        res.json({ success: true, count: tasks.length, tasks: tasks.map(format) });
    } catch (e) {
        console.error("Task Generation API Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// --- 获取每日任务 (含自动同步逻辑) ---
router.get(['/daily_tasks', '/daily_task'], async (req, res) => {
    try {
        const { userId, date } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const targetDate = date || getLocalDateString();
        const idList = await resolveUserIds(userId);
        const primaryId = await resolvePrimaryId(userId);

        // 核心逻辑：先检查今天是否已有任务，若无则自动触发同步
        const existingTasks = await DailyTask.find({ 
            userId: { $in: idList }, 
            date: targetDate 
        }).lean();

        console.log(`[DailyTask] Sync check: user=${primaryId}, date=${targetDate}, existing=${existingTasks.length}`);

        if (existingTasks.length === 0) {
            console.log(`[DailyTask] Triggering template sync for ${primaryId} on ${targetDate}`);
            const newTasks = await TaskPolicyService.generateTasksFromTemplates(primaryId, targetDate);
            return res.json(newTasks.map(format));
        }

        res.json(existingTasks.map(format));
    } catch (e) { 
        console.error("Daily Task API Error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// --- 获取单条任务 ---
router.get(['/daily_tasks/:id', '/daily_task/:id'], async (req, res) => {
    try {
        const data = await DailyTask.findById(req.params.id);
        res.json(format(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 创建任务 ---
router.post(['/daily_tasks', '/daily_task'], async (req, res) => {
    try {
        const primaryId = await resolvePrimaryId(req.body.userId);
        const data = await DailyTask.create({ 
            ...req.body, 
            userId: primaryId,
            createdAt: new Date() 
        });
        res.json(format(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 更新任务 (打勾、状态更新) ---
router.patch(['/daily_tasks/:id', '/daily_task/:id'], async (req, res) => {
    try {
        const updated = await DailyTask.findByIdAndUpdate(
            req.params.id, 
            { ...req.body, updatedAt: new Date() }, 
            { new: true }
        );
        res.json(format(updated));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 删除任务 ---
router.delete(['/daily_tasks/:id', '/daily_task/:id'], async (req, res) => {
    try {
        await DailyTask.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User, ChatMessage } = require('../models');
const { format } = require('../utils');
const { resolveUserIds, resolvePrimaryId } = require('../utils/idResolver');
const GeminiService = require('../services/GeminiService');
const AnalysisService = require('../services/AnalysisService');
const MemoryService = require('../services/MemoryService');
const ReminderService = require('../services/ReminderService');

// --- 核心 AI 对话 ---
router.post('/chat', async (req, res) => {
    try {
        const { messages, profile, isVoice } = req.body;
        const userMessage = messages[messages.length - 1]?.content;
        const effectiveUserId = profile?.id || profile?.firebaseUid;
        
        let bioProfile = null;
        if (effectiveUserId) {
            bioProfile = await User.findOne({
                $or: [{ firebaseUid: effectiveUserId }, { _id: mongoose.isValidObjectId(effectiveUserId) ? effectiveUserId : null }]
            });
        }

        const models = ['gemini-2.0-pro-exp-02-05', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
        let reply = '';
        
        for (const model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: messages.map(m => ({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: m.content }]
                        })),
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (reply) break;
                }
            } catch (e) {
                console.error(`[AI] Failed with model ${model}:`, e.message);
            }
        }

        if (!reply) {
            return res.json({ reply: "抱歉，五养专家目前正忙，请稍后再试。" });
        }

        // 记忆提取
        if (effectiveUserId && bioProfile) {
            MemoryService.extractNewInsights(userMessage, reply, bioProfile.aiInsights || [])
                .then(newInsights => {
                    if (newInsights && newInsights.length !== (bioProfile.aiInsights?.length || 0)) {
                        User.findByIdAndUpdate(bioProfile._id, { $set: { aiInsights: newInsights } })
                            .then(() => console.log(`[Memory] Insights updated for ${effectiveUserId}`));
                    }
                })
                .catch(err => console.error("[Memory] Failed:", err));
        }

        let audio = null;
        if (reply && isVoice) {
            try {
                const cleanText = reply.replace(/[#*`~>]/g, '').trim();
                audio = await GeminiService.generateAudio(cleanText, profile?.voicePreference || 'Kore');
            } catch (e) { console.error("[AI] TTS failed:", e); }
        }

        res.json({ reply, audio });
    } catch (e) {
        console.error("[AI Chat Error]", e);
        res.json({ reply: "抱歉，五养专家正在休息中。" });
    }
});

// --- 健康报告生成 ---
router.post('/generate-health-report', async (req, res) => {
    try {
        const userId = req.body.userId || req.body.profile?.id;
        const result = await AnalysisService.generateHealthReport(userId, req.body.profile);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---语音合成预览 ---
router.post('/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;
        const audio = await GeminiService.generateAudio(text, voice || 'Kore');
        res.json({ audio });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 日记总结 ---
router.post('/diary/summarize', async (req, res) => {
    try {
        const result = await AnalysisService.summarizeDiary(req.body.history, req.body.profile);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 干预推送 ---
router.post('/interventions', async (req, res) => {
    try {
        const { userId, content, category } = req.body;
        const message = await ReminderService.sendIntervention(userId, content, category);
        res.json({ success: true, messageId: message._id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

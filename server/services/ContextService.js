const mongoose = require('mongoose');
const { User, DailyTask, DailySymptom, ChatMessage } = require('../models');
const KnowledgeService = require('./KnowledgeService');

/**
 * 全维上下文服务 (Context Hub)
 * 实现：为所有 AI 模块提供一致、高保真的用户画像、执行状态和背景理论。
 */
class ContextService {
    /**
     * 获取用户全维上下文
     * @param {string} userId (可以是 MongoDB ID 或 Firebase UID)
     * @returns {Promise<Object>}
     */
    static async getFullContext(userId) {
        if (!userId) return null;

        try {
            // 1. 获取核心档案
            const user = await User.findOne({ 
                $or: [
                    { firebaseUid: userId }, 
                    { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }
                ] 
            });
            if (!user) return null;
            const userObj = user.toObject ? user.toObject({ getters: true }) : user;

            // 2. 获取今日执行进度 (Adherence)
            const today = this.getLocalDateString();
            const idList = [userObj.id, userObj.firebaseUid].filter(Boolean);
            const tasks = await DailyTask.find({ userId: { $in: idList }, date: today });
            const completedCount = tasks.filter(t => t.completed).length;
            const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : null;
            
            // 3. 获取今日症状 (Symptoms)
            const symptomsDoc = await DailySymptom.findOne({ userId: { $in: idList }, date: today });
            const symptoms = symptomsDoc ? (symptomsDoc.symptoms || []) : [];

            // 4. 用户画像摘要 (Bio-Psycho-Social Profile)
            const bioProfile = {
                id: userObj.id,
                nickname: userObj.nickname || '用户',
                cancerType: userObj.cancerType || '待定',
                stage: userObj.stage || '待定',
                scores: userObj.scores || { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 100 },
                adherence: progress !== null ? `今日任务完成度 ${progress}% (${completedCount}/${tasks.length})` : "今日暂无任务记录",
                currentSymptoms: symptoms.length > 0 ? `当前症状：${symptoms.join(', ')}` : "今日暂未上报明显症状",
                aiInsights: userObj.aiInsights || [] // 核心：AI 长期记忆
            };

            return bioProfile;
        } catch (e) {
            console.error("[ContextService] Failed to gather context:", e);
            return null;
        }
    }

    /**
     * 组装给 AI 的完整 Context Prompt Fragment
     * @param {Object} bioProfile 
     * @param {string} query (用户问题)
     * @returns {string}
     */
    static buildContextPrompt(bioProfile, query = "") {
        if (!bioProfile) return "";

        const theoryNode = KnowledgeService.getRelevantTheory(query);

        return `
[患者全维画像]
类型/阶段: ${bioProfile.cancerType}(${bioProfile.stage})
健康评分(五养分): 饮食${bioProfile.scores.diet}, 运动${bioProfile.scores.exercise}, 心理${bioProfile.scores.mental}, 机能${bioProfile.scores.function}
今日执行状态: ${bioProfile.adherence}, ${bioProfile.currentSymptoms}
[长期记忆 (你之前学到的)]: ${bioProfile.aiInsights.join('; ') || '暂无'}

[林洪生“五养”关联背景]
${theoryNode}
`.trim();
    }

    static getLocalDateString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

module.exports = ContextService;

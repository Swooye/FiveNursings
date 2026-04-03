const { DailyTask, TaskTemplate } = require('../models');
const AnalysisService = require('./AnalysisService');

class TaskPolicyService {
    /**
     * 根据患者档案生成初始或评估后的康复计划
     * @param {string} userId 
     * @param {Object} profile 
     * @param {string} date (YYYY-MM-DD)
     * @param {boolean} commit 是否正式写入数据库
     */
    static async generateTasksFromProfile(userId, profile, date, commit = false) {
        // --- 核心升级：优先尝试 AI 生成精准计划 ---
        try {
            const aiTasks = await AnalysisService.generateAITasks(profile, date);
            if (aiTasks && aiTasks.length > 0) {
                const finalTasks = aiTasks.map(t => ({ ...t, userId, source: 'ai' }));
                if (commit) {
                    for (const t of finalTasks) {
                        await DailyTask.findOneAndUpdate(
                            { userId, date: t.date, category: t.category, title: t.title },
                            { $set: t }, // AI 生成的计划覆盖旧的
                            { upsert: true, new: true }
                        );
                        // [ALIGNMENT] 同步保存为长期模板，确保未来日期可自动填充
                        await TaskTemplate.findOneAndUpdate(
                            { userId, category: t.category, title: t.title },
                            { 
                                $set: { 
                                    ...t, 
                                    startDate: t.date,
                                    frequency: t.frequency || 'daily',
                                    isActive: true,
                                    isInfeasible: false
                                } 
                            },
                            { upsert: true }
                        );
                    }
                    return await DailyTask.find({ userId, date });
                }
                return finalTasks;
            }
        } catch (e) {
            console.error("AI Task Generation failed, falling back to static rules:", e);
        }

        // --- 降级方案：原有的静态规则库 ---
        const tasks = [];
        const cancerType = profile.cancerType || 'OTHER';
        const stage = profile.stage || 'UNTREATED';

        const defaultProtocol = { cycle: '14天周期', frequency: 'daily' };

        // 基础康复序列 (Base Recovery)
        tasks.push({ 
            userId, category: 'diet', title: '早起温开水 200ml', 
            description: '唤醒肠胃代谢，促进化疗毒素排泄。', time: '07:00', date, completed: false, source: 'ai',
            ...defaultProtocol
        });
        tasks.push({ 
            userId, category: 'diet', title: '优质蛋白补给', 
            description: '确保日均 1.2g/kg 蛋白摄入以防止肌肉流失。', time: '08:30', date, completed: false, source: 'ai',
            ...defaultProtocol
        });

        // 病种专项序列 (Cancer Specific)
        if (cancerType === 'LUNG') {
            tasks.push({ 
                userId, category: 'function', title: '扩胸呼吸操 (15min)', 
                description: '肺癌康复核心：增加肺活量，预防术后胸膜粘连。', time: '10:00', date, completed: false, source: 'ai',
                cycle: '21天强化', frequency: 'daily'
            });
            tasks.push({ 
                userId, category: 'function', title: '腹式呼吸训练', 
                description: '深慢呼吸以改善通气血流比例。', time: '16:00', date, completed: false, source: 'ai',
                ...defaultProtocol
            });
        } else if (cancerType === 'COLORECTAL') {
            tasks.push({ 
                userId, category: 'diet', title: '少量多餐 - 间食补给', 
                description: '肠道肿瘤康复：减轻肠道负担，少量分次进食。', time: '15:00', date, completed: false, source: 'ai',
                cycle: '14天周期', frequency: 'daily'
            });
        } else {
            tasks.push({ 
                userId, category: 'function', title: '基础呼吸机能训练', 
                description: '通用的心肺机能增强训练。', time: '10:00', date, completed: false, source: 'ai',
                ...defaultProtocol
            });
        }

        // 阶段专项序列 (Stage Specific)
        if (stage === 'SURGERY_RECOVERY') {
            tasks.push({ 
                userId, category: 'exercise', title: '病房/家内走动 15min', 
                description: '术后预防下肢深静脉血栓的关键。', time: '11:00', date, completed: false, source: 'ai',
                cycle: '7天初期', frequency: 'daily'
            });
        } else {
            tasks.push({ 
                userId, category: 'exercise', title: '快走/慢跑 20min', 
                description: '维持中等强度有氧运动。', time: '17:00', date, completed: false, source: 'ai',
                cycle: '长期维持', frequency: '每周五次'
            });
        }

        tasks.push({ 
            userId, category: 'mental', title: '午间情绪冥想', 
            description: '平复康复焦虑，降低皮质醇水平。', time: '13:00', date, completed: false, source: 'ai',
            ...defaultProtocol
        });

        // 写入数据库 (Upsert per category/title)
        if (commit) {
            for (const t of tasks) {
                await DailyTask.findOneAndUpdate(
                    { userId, date: t.date, category: t.category, title: t.title },
                    { $setOnInsert: t },
                    { upsert: true, new: true }
                );
                // [ALIGNMENT] 静态规则也同步为模板
                await TaskTemplate.findOneAndUpdate(
                    { userId, category: t.category, title: t.title },
                    { 
                        $setOnInsert: { 
                            ...t, 
                            startDate: t.date,
                            frequency: 'daily',
                            isActive: true
                        } 
                    },
                    { upsert: true }
                );
            }
            return await DailyTask.find({ userId, date });
        }

        // 如果不提交，直接返回内存中的建议列表
        return tasks;
    }

    /**
     * 医护手动干预任务
     * @param {Object} taskData 
     */
    static async addManualTask(taskData) {
        const docTask = {
            ...taskData,
            isManual: true, // 标记为人工干预
            source: 'doctor' // 来源医生
        };
        return await DailyTask.create(docTask);
    }

    /**
     * 从长期模板生成指定日期的任务实例
     * @param {string} userId 
     * @param {string} date (YYYY-MM-DD)
     */
    static async generateTasksFromTemplates(userId, date) {
        console.log(`[TaskPolicy] Auto-filling tasks from templates for user ${userId} on ${date}`);
        const templates = await TaskTemplate.find({ 
            userId, 
            isActive: true,
            isInfeasible: false,
            startDate: { $lte: date },
            $or: [
                { endDate: { $exists: false } },
                { endDate: "" },
                { endDate: { $gte: date } }
            ]
        });

        const instances = [];
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        const dayOfWeek = targetDate.getDay(); // 0-6 (Local date components)

        for (const template of templates) {
            // 检查截止日期
            if (template.endDate && template.endDate < date) continue;

            let shouldGenerate = false;
            let initialCount = 0;
            const targetCount = template.targetCount || 1;

            if (template.frequency === 'daily') {
                shouldGenerate = true;
            } else if (template.frequency === 'weekly') {
                shouldGenerate = true;
                // 计算本周起始 (周一为第一天)
                const weekStart = new Date(targetDate);
                const day = weekStart.getDay(); // 0-6
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
                weekStart.setDate(diff);
                const weekStartStr = weekStart.toISOString().split('T')[0];

                // 查找本周内该模板的最新记录
                const latestTask = await DailyTask.findOne({ 
                    userId, 
                    templateId: template._id,
                    date: { $gte: weekStartStr, $lt: date }
                }).sort({ date: -1 });
                
                if (latestTask) initialCount = latestTask.currentCount || 0;
            } else if (template.frequency === 'monthly') {
                shouldGenerate = true;
                // 计算本月起始
                const monthStartStr = `${date.substring(0, 7)}-01`;
                
                const latestTask = await DailyTask.findOne({ 
                    userId, 
                    templateId: template._id,
                    date: { $gte: monthStartStr, $lt: date }
                }).sort({ date: -1 });

                if (latestTask) initialCount = latestTask.currentCount || 0;
            }

            if (shouldGenerate) {
                instances.push({
                    userId: template.userId,
                    date,
                    category: template.category,
                    title: template.title,
                    description: template.description,
                    time: template.time || '全天',
                    completed: initialCount >= targetCount,
                    isInfeasible: false,
                    source: template.source || 'ai',
                    suggestedTimes: template.suggestedTimes || [],
                    templateId: template._id, // 关联模板
                    currentCount: initialCount,
                    targetCount: targetCount,
                    frequency: template.frequency
                });
            }
        }

        if (instances.length > 0) {
            for (const instance of instances) {
                await DailyTask.findOneAndUpdate(
                    { userId: instance.userId, date: instance.date, category: instance.category, title: instance.title },
                    { $setOnInsert: instance },
                    { upsert: true, new: true }
                );
            }
            console.log(`[TaskPolicy] Generated ${instances.length} instances.`);
        } else {
            console.log(`[TaskPolicy] No templates matched for this date.`);
        }

        return await DailyTask.find({ userId, date });
    }
}

module.exports = TaskPolicyService;

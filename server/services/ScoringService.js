const { User, DailyTask, VoiceLog } = require('../models');

class ScoringService {
    /**
     * 五养维度权重定义 (归一化至 100%)
     * 环境养 (environment) 权重设为 0，仅作为后台参考指标
     */
    static getWeights(stage) {
        const DEFAULT_WEIGHTS = { 
            diet: 0.25, 
            exercise: 0.20, 
            sleep: 0.20, 
            mental: 0.20, 
            function: 0.15, 
            environment: 0 
        };
        
        if (['术后30天内', '化疗中', '放疗中', '术后/化疗期'].includes(stage)) {
            return { diet: 0.30, function: 0.30, sleep: 0.15, mental: 0.15, exercise: 0.10, environment: 0 };
        } else if (['稳定随访期', '康复巩固期'].includes(stage)) {
            return { diet: 0.20, function: 0.15, sleep: 0.25, mental: 0.20, exercise: 0.20, environment: 0 };
        }
        
        return DEFAULT_WEIGHTS;
    }

    /**
     * 康复基准线 (Health Baseline) 定义
     * 每一项指标从基准分开始，根据今日行为进行奖惩
     */
    static getBaselines() {
        return {
            diet: 60,      // 饮食基准：基本营养
            exercise: 40,  // 运动基准：静息状态
            sleep: 70,     // 膏方/睡眠基准：规律起居
            mental: 80,    // 心理基准：平稳心态
            function: 80   // 功能基准：稳定状态 (支持通过训练提高至 100)
        };
    }

    /**
     * 全量计算用户五养分值与核心康复指数 (奖惩机制版)
     */
    static async calculateIndex(userId) {
        console.log(`[ScoringService] Starting index calculation for user: ${userId}`);
        const user = await User.findById(userId) || await User.findOne({ firebaseUid: userId });
        if (!user) {
            console.error(`[ScoringService] User ${userId} not found`);
            throw new Error("User not found");
        }

        const today = new Date().toISOString().split('T')[0];
        const tasks = await DailyTask.find({ userId: userId, date: today });
        const baselines = this.getBaselines();
        
        const scores = { ...user.scores };

        // 1. 饮食养 (Diet): 基准 60
        const dietTasks = tasks.filter(t => t.category === 'diet');
        let dietReward = 0;
        if (dietTasks.length > 0) {
            const completedCount = dietTasks.filter(t => t.completed).length;
            dietReward = (completedCount / dietTasks.length) * 40; // 最高奖 40 分
        } else {
            dietReward = 20; // 无任务时默认为中等依从
        }
        scores.diet = Math.min(100, baselines.diet + dietReward);

        // 2. 运动养 (Exercise): 基准 40
        const steps = user.wearable?.steps || 3000;
        let exerciseDelta = 0;
        if (steps >= 6000) {
            exerciseDelta = 20 + Math.min(40, ((steps - 6000) / 4000) * 40); // 正常+奖励: >6k
        } else if (steps >= 3000) {
            exerciseDelta = ((steps - 3000) / 3000) * 20; // 趋向基准: 3k-6k
        } else {
            exerciseDelta = -Math.min(40, ((3000 - steps) / 3000) * 40); // 惩罚: <3k
        }
        scores.exercise = Math.min(100, Math.max(0, baselines.exercise + exerciseDelta));

        // 3. 膏方养 (Sleep/TCM): 基准 70
        const sleepHours = user.wearable?.sleepHours || 7.0;
        let sleepDelta = 0;
        if (sleepHours >= 7 && sleepHours <= 9) sleepDelta = 20; // 奖励：优质睡眠
        else if (sleepHours < 5) sleepDelta = -20; // 惩罚：严重睡眠不足
        
        // 膏方任务奖励
        const tcmTasks = tasks.filter(t => t.category === 'sleep' && t.completed);
        sleepDelta += (tcmTasks.length * 10); 
        scores.sleep = Math.min(100, Math.max(0, baselines.sleep + sleepDelta));

        // 4. 心理养 (Mental): 基准 80
        // 目前基于上一次记录或默认，未来可接入 AI 语义分析后的 Reward/Penalty
        scores.mental = scores.mental > 0 ? scores.mental : baselines.mental;

        // 5. 功能养 (Function): 基准 80
        // 奖励：通过功能性训练任务提高 (如呼吸操)
        const functionTasks = tasks.filter(t => t.category === 'function' && t.completed);
        const functionReward = functionTasks.length * 10;
        
        // 惩罚：症状上报
        const symptomCount = (user.todaySymptoms || []).length;
        const symptomPenalty = symptomCount * 15;
        
        scores.function = Math.min(100, Math.max(0, baselines.function + functionReward - symptomPenalty));

        // 6. 环境养 (Environmental): 仅作为后台参考，不影响 CRI
        const { getLiveWeather } = require('../utils');
        const weather = await getLiveWeather(user.locationAdcode || "310000");
        let envScore = 85; 
        if (weather.weather.includes('晴')) envScore += 8;
        if (weather.weather.includes('雨')) envScore -= 5;
        if (weather.weather.includes('霾') || weather.weather.includes('雾')) envScore -= 10;
        scores.environment = Math.min(100, Math.max(0, envScore));

        // 7. 加权计算核心康复指数 (CRI)
        const weights = this.getWeights(user.stage);
        const cri = Math.round(
            scores.diet * weights.diet +
            scores.function * weights.function +
            scores.sleep * weights.sleep +
            scores.mental * weights.mental +
            scores.exercise * weights.exercise
        );

        // 8. 干预触发 (Interventions)
        const ReminderService = require('./ReminderService');
        await ReminderService.checkAlerts(userId, user.scores, scores);

        // 9. 数据持久化
        user.scores = scores;
        user.coreRecoveryIndex = cri;
        await user.save();
        console.log(`[ScoringService] Calculation complete. Score: ${cri}, Scores:`, scores);
        return { scores, cri, baselines };
    }
}

module.exports = ScoringService;

const { User, DailyTask, VoiceLog } = require('../models');

class ScoringService {
    /**
     * 五养维度权重定义 (归一化至 100%)
     * 环境养 (environment) 权重设为 0，仅作为后台参考指标
     */
    static getWeights(stage) {
        const DEFAULT_WEIGHTS = { 
            diet: 0.20,     // 饮食
            exercise: 0.20, // 运动
            sleep: 0.20,    // 膏方 (mapping sleep to tcm)
            mental: 0.20,   // 心理
            function: 0.20, // 功能
            environment: 0 
        };
        
        // Ensure even distribution for the Five Nursings standard
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
        
        let user;
        // 尝试先按 Firebase UID 查找，如果不象 ObjectID 则跳过 findById 以防报错
        if (userId.length === 24) {
            try { user = await User.findById(userId); } catch (e) {}
        }
        if (!user) {
            user = await User.findOne({ firebaseUid: userId });
        }
        
        if (!user) {
            console.error(`[ScoringService] User ${userId} not found`);
            throw new Error("User not found");
        }

        const today = new Date().toISOString().split('T')[0];
        const { getLiveWeather } = require('../utils');
        
        // PERFORMANCE OPTIMIZATION: Concurrent data fetching
        const [tasks, weather] = await Promise.all([
            DailyTask.find({ userId: user._id.toString(), date: today }),
            // Wrap weather in a defensive timeout (2s) to prevent blocking
            Promise.race([
                getLiveWeather(user.locationAdcode || "310000"),
                new Promise(resolve => setTimeout(() => resolve({ weather: "未知", temperature: "--", humidity: "--" }), 2000))
            ])
        ]);
        
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

        // 3. 膏方养 (TCM): 基准 70 (Mapped from sleep/tcm)
        const tcmCategory = tasks.some(t => t.category === 'tcm') ? 'tcm' : 'sleep';
        const tcmTasks = tasks.filter(t => (t.category === 'tcm' || t.category === 'sleep') && t.completed);
        
        let tcmDelta = 0;
        const sleepHours = user.wearable?.sleepHours || 7.0;
        if (sleepHours >= 7 && sleepHours <= 9) tcmDelta = 20; 
        else if (sleepHours < 5) tcmDelta = -20;
        
        tcmDelta += (tcmTasks.length * 10); 
        scores.sleep = Math.min(100, Math.max(0, baselines.sleep + tcmDelta));

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

        // 6. 环境养 (Environmental): 已经由 Promise.all 获取
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
        
        // 9. 计算变动率 (Daily Change Calculation)
        const prevCri = user.coreRecoveryIndex; // 不再使用 || cri
        let dailyChange = "0.0%";
        if (prevCri > 0 && cri > 0) {
            const change = cri - prevCri;
            if (change === 0) {
                dailyChange = "+0.0%";
            } else {
                const sign = change > 0 ? "+" : "";
                const percent = ((change / prevCri) * 100).toFixed(1);
                dailyChange = `${sign}${percent}%`;
            }
        }

        // 10. 数据持久化
        user.scores = scores;
        user.coreRecoveryIndex = cri;
        user.dailyChange = dailyChange; // 存入数据库供前端展示
        
        // 核心修复：显式标记 scores 已修改，并保存
        user.markModified('scores');
        await user.save();
        
        console.log(`[ScoringService] Calculation complete. Score: ${cri} (${dailyChange}), Scores:`, scores);
        return { scores, cri, dailyChange, baselines };
    }
}

module.exports = ScoringService;

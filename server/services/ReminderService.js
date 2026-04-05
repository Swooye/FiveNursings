const { ChatMessage, User } = require('../models');
const { resolveUserIds } = require('../utils/idResolver');

class ReminderService {
    /**
     * 发送健康干预消息 (v1.5)
     * @param {string} userId 
     * @param {string} content 
     * @param {string} category 
     */
    static async sendIntervention(userId, content, category = '健康干预') {
        const idList = await resolveUserIds(userId, User);
        const resolvedUserId = idList[0] || userId;

        // [SESSION_ISOLATION] 每一次干预都开启一个独立的新会话，避免内容混叠
        const now = new Date();
        const sessionId = `INT_${now.getTime()}_${Math.floor(Math.random() * 1000)}`;
        const sessionTitle = `健康干预: ${category} (${now.getMonth()+1}/${now.getDate()})`;

        const message = await ChatMessage.create({
            userId: resolvedUserId,
            role: 'model',
            text: content,
            type: 'intervention',
            category: category,
            sessionId: sessionId,
            sessionTitle: sessionTitle,
            isRead: false,
            timestamp: now
        });

        console.log(`[ReminderService] Created isolated intervention session: ${sessionId}`);
        return message;
    }

    /**
     * 根据指数下降触发自动预警
     * @param {string} userId 
     * @param {Object} oldScores 
     * @param {Object} newScores 
     */
    static async checkAlerts(userId, oldScores, newScores) {
        const Threshold = 10; // 降幅阈值
        const alerts = [];
        
        for (const cat of ['diet', 'exercise', 'sleep', 'mental', 'function']) {
            if (oldScores[cat] - newScores[cat] > Threshold) {
                alerts.push(cat);
            }
        }
        
        if (alerts.length > 0) {
            // 防止重复预警：检查 1 小时内是否发送过相同的预警
            const oneHourAgo = new Date(Date.now() - 3600000);
            const recentMatch = await ChatMessage.findOne({
                userId: userId,
                type: 'intervention',
                timestamp: { $gte: oneHourAgo }
            });
            
            if (recentMatch) {
                console.log(`[ReminderService] Alert throttled for user ${userId} to avoid duplication.`);
                return false;
            }

            const content = `[智能预警] 检测到您的${alerts.map(a => a === 'diet' ? '饮食' : a === 'exercise' ? '运动' : a === 'sleep' ? '膏方' : a === 'mental' ? '心理' : '功能').join('、')}指标近期有所下降。建议您在康复日记中记录具体感受，或咨询您的康复教练。`;
            await this.sendIntervention(userId, content, '核心指标波动');
            return true;
        }
        
        return false;
    }
}

module.exports = ReminderService;

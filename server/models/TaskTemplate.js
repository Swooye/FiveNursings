const mongoose = require('mongoose');

const taskTemplateSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    time: String, // 推荐时间或文字描述，如 "08:00" 或 "早起"
    frequency: { 
        type: String, 
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        default: 'daily'
    },
    targetCount: { type: Number, default: 1 }, // 目标执行次数，默认1次
    frequencyValue: Number, // 保留备份用于其他自定义标志
    daysOfWeek: [Number], // 0-6 代表周日到周六
    startDate: { type: String, required: true }, // YYYY-MM-DD
    endDate: String, // YYYY-MM-DD，若为空则长期有效
    isActive: { type: Boolean, default: true },
    isInfeasible: { type: Boolean, default: false },
    source: { type: String, default: 'ai' },
    suggestedTimes: [String]
}, { timestamps: true, collection: 'task_templates' });

module.exports = mongoose.model('TaskTemplate', taskTemplateSchema);

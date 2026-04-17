require('dotenv').config();
const mongoose = require('mongoose');
const { DailyTask, TaskTemplate } = require('./models');
const TaskPolicyService = require('./services/TaskPolicyService');

async function testPersistence() {
    console.log("Connecting to DB...");
    const DB_NAME = process.env.MONGODB_DB_NAME || (process.env.NODE_ENV === 'production' ? 'fivenursing_pro' : 'fivenursing_dev');
    
    // 修复可能存在的特殊字符连接问题
    let baseUri = process.env.MONGODB_URI;
    if (!baseUri.includes(DB_NAME)) {
        if (baseUri.includes('?')) {
            baseUri = baseUri.replace(/\?/, `${DB_NAME}?`);
        } else {
            baseUri = baseUri.endsWith('/') ? `${baseUri}${DB_NAME}` : `${baseUri}/${DB_NAME}`;
        }
    }
    
    await mongoose.connect(baseUri);
    console.log("✅ Connected to", DB_NAME);
    
    const userId = "test_user_persistent_v1";
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    // 清理数据
    await DailyTask.deleteMany({ userId });
    await TaskTemplate.deleteMany({ userId });

    console.log("\n--- TEST 1: Doctor adding a Gao Fang task (Permanent) ---");
    const doctorTask = await TaskPolicyService.addManualTask({
        userId,
        category: 'diet_herbal',
        title: '每日益气膏方',
        description: '医生开出的长期医嘱',
        date: today,
        frequency: 'daily',
        isPermanent: true
    });
    
    console.log("Daily Task Created:", doctorTask.title, "| Source:", doctorTask.source, "| isManual:", doctorTask.isManual);
    
    const template = await TaskTemplate.findOne({ userId, title: '每日益气膏方' });
    if (template && template.source === 'doctor' && template.isManual) {
        console.log("✅ Template correctly synced with metadata!");
    } else {
        console.log("❌ Template sync FAILED!", template);
    }

    console.log("\n--- TEST 2: Automatic generation for tomorrow ---");
    const tomorrowTasks = await TaskPolicyService.generateTasksFromTemplates(userId, tomorrow);
    const gaoFangInstance = tomorrowTasks.find(t => t.title === '每日益气膏方');
    
    if (gaoFangInstance && gaoFangInstance.source === 'doctor' && gaoFangInstance.isManual) {
        console.log("✅ Tomorrow's task inherited metadata correctly!");
    } else {
        console.log("❌ Tomorrow's task metadata LOST!", gaoFangInstance);
    }

    console.log("\n--- TEST 3: AI Overwrite Protection ---");
    // Simulate AI trying to generate a task with the same title
    const profile = { nickname: '测试', cancerType: 'LUNG', stage: 'UNTREATED' };
    
    // Mock generateAITasks to return a task with same title but different description
    const AnalysisService = require('./services/AnalysisService');
    const originalGenerateAITasks = AnalysisService.generateAITasks;
    AnalysisService.generateAITasks = async () => [
        { 
            category: 'diet_herbal', 
            title: '每日益气膏方', 
            description: 'AI 企图篡改的说明', 
            time: '09:00',
            frequency: 'daily'
        },
        {
            category: 'exercise',
            title: 'AI 推荐慢走',
            description: '这是新的建议',
            time: '18:00',
            frequency: 'daily'
        }
    ];

    await TaskPolicyService.generateTasksFromProfile(userId, profile, tomorrow, true);
    
    const finalTask = await DailyTask.findOne({ userId, date: tomorrow, title: '每日益气膏方' });
    if (finalTask && finalTask.description === '医生开出的长期医嘱' && finalTask.source === 'doctor') {
        console.log("✅ AI was BLOCKED from overwriting doctor task!");
    } else {
        console.log("❌ AI OVERWROTE the doctor task!", finalTask);
    }
    
    const aiTask = await DailyTask.findOne({ userId, date: tomorrow, title: 'AI 推荐慢走' });
    if (aiTask && aiTask.source === 'ai') {
        console.log("✅ AI new task added correctly alongside doctor task.");
    }

    // 还原 Mock
    AnalysisService.generateAITasks = originalGenerateAITasks;
    
    // 清理
    await DailyTask.deleteMany({ userId });
    await TaskTemplate.deleteMany({ userId });
    
    console.log("\nAll tests finished.");
    await mongoose.disconnect();
}

testPersistence().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
});

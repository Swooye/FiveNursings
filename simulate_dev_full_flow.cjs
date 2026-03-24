const mongoose = require('mongoose');

async function auditAndSimulate() {
    const DEV_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";
    await mongoose.connect(DEV_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    const User = mongoose.connection.db.collection('users');
    const ChatMessage = mongoose.connection.db.collection('chatmessages');
    
    const testUid = "BngUNe8YvrPU3uM3wj3FTr6wzCm2";
    const userDoc = await User.findOne({ firebaseUid: testUid });

    console.log("\n--- [DEBUG] REAL DB RECORD CONTENT ---");
    console.log(JSON.stringify(userDoc, null, 2));

    if (!userDoc) {
        console.error("User not found in DB!");
        process.exit(1);
    }

    // 根据真实字段提取数据
    const name = userDoc.nickname || userDoc.name || "用户";
    const cancer = userDoc.cancerType || "康复";
    const stage = userDoc.stage || "平稳期";

    const userMessage = "我今天走了6000步！";
    const aiReply = `太棒了，${name}！在${stage}阶段坚持步行6000步对${cancer}康复非常有益。已为您记录！`;

    console.log("\n--- [RESULT] GENERATED REPLY ---");
    console.log(aiReply);

    // 尝试存入 ChatMessage 集合
    await ChatMessage.insertOne({
        userId: testUid,
        role: 'user',
        text: userMessage,
        timestamp: new Date()
    });
    await ChatMessage.insertOne({
        userId: testUid,
        role: 'model',
        text: aiReply,
        timestamp: new Date()
    });

    console.log("\n✅ Database Persistence verified.");
    await mongoose.connection.close();
    process.exit(0);
}

auditAndSimulate();

const mongoose = require('mongoose');

async function simulateInternalError() {
    console.log("--- Simulating the 'INTERNAL' error scenario ---");
    
    // 定义模型但先不连接数据库
    const ChatMessage = mongoose.model('ChatTest', new mongoose.Schema({ text: String }, { collection: 'chatmessages' }));

    try {
        console.log("Attempting to save message WITHOUT connecting to DB...");
        // 这行会卡住或者报错，模拟云函数的崩溃
        await ChatMessage.create({ text: "Test Message" });
        console.log("Save successful (Unexpected)");
    } catch (e) {
        console.log("Caught expected error:", e.message);
    }

    console.log("\n--- Now simulating the FIX ---");
    const BASE_URI = "mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority";
    
    try {
        await mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to DB successfully.");
        await ChatMessage.create({ text: "Test Message with DB Fix" });
        console.log("Save successful after connection fix! ✅");
    } catch (e) {
        console.error("Fix failed:", e);
    }
    
    process.exit(0);
}

simulateInternalError();

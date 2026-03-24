const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const chatSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
}, { strict: false, collection: 'chatmessages' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatSchema);

async function simulateGetAIChatResponse(request) {
    try {
        await mongoose.connect("mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/fivenursing_dev?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("  [1/4] DB Connection: OK");
    } catch (e) { throw new Error("DB Connection failed: " + e.message); }
    
    const userId = request.auth.uid;
    const userMessageText = request.data.text;
    console.log(`  [2/4] Received Text: "${userMessageText}" from UID: ${userId}`);

    try {
        await ChatMessage.create({ userId, role: 'user', text: userMessageText, timestamp: new Date() });
        console.log("  [3/4] User message saved to DB: OK");
    } catch (e) { throw new Error("Failed to save user message: " + e.message); }

    try {
        const aiReplyText = `收到：“${userMessageText}”。记录成功。`;
        await ChatMessage.create({ userId, role: 'model', text: aiReplyText, timestamp: new Date() });
        console.log("  [4/4] AI reply saved to DB: OK");
        return { reply: aiReplyText };
    } catch (e) { throw new Error("Failed to save AI reply: " + e.message); }
}

async function runTest() {
    console.log("--- STARTING LOCAL SIMULATION ---");
    const mockRequest = {
        auth: { uid: "BngUNe8YvrPU3uM3wj3FTr6wzCm2" },
        data: { text: "中午睡了半个小时" }
    };
    try {
        const result = await simulateGetAIChatResponse(mockRequest);
        console.log("\n--- SIMULATION SUCCEEDED --- ✅");
        console.log(`Final Reply: "${result.reply}"`);
    } catch (e) {
        console.error("\n--- SIMULATION FAILED --- ❌");
        console.error("Error:", e.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}
runTest();

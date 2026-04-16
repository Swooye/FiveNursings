require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    const apiKey = process.env.GOOGLE_API_KEY;
    console.log("Checking API Key:");
    console.log("Length:", apiKey ? apiKey.length : 0);
    console.log("First 4 chars:", apiKey ? apiKey.substring(0, 4) : "NONE");
    
    if (!apiKey) {
        console.error("GOOGLE_API_KEY is missing!");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log("Gemini 1.5 Flash Response:", response.text());
        
        console.log("\nTesting Gemini 2.0 Flash Audio...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const res2 = await model2.generateContent({
            contents: [{ role: "user", parts: [{ text: "Say hello." }] }],
            generationConfig: { responseModalities: ["audio"] }
        });
        const resp2 = await res2.response;
        console.log("Gemini 2.0 Audio returned:", !!resp2.candidates?.[0]?.content?.parts?.find(p => p.inlineData));
    } catch (err) {
        console.error("Gemini Test Failed:", err.message);
    }
}

testGemini();

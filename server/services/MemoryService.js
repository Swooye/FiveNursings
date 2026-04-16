const fetch = require('node-fetch');

/**
 * AI 记忆服务 (User Insights Service)
 * 实现：通过对话提取用户的偏好、身体状况的变化及心理状态，实现“越用越懂用户”。
 * 策略：通过后台轻量级 LLM 任务进行“自我反思”式更新。
 */
class MemoryService {
    /**
     * 从对话文本中提取新的画像洞察 (Insights)
     * @param {string} userMessage 用户最新信息
     * @param {string} assistantReply AI 回复
     * @param {Array} currentInsights 现有条目
     * @returns {Promise<Array>}
     */
    static async extractNewInsights(userMessage, assistantReply, currentInsights = []) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return currentInsights;

        const systemPrompt = `你是一位敏感的健康观察员。分析对话，提取关于用户最新的【长效康复画像条目】。
要求：
1. 提取用户明确提到的：偏好（如“我不吃生冷”）、并发症/过敏（如“对化疗药过敏”）、生活习惯（“习惯早起”）、当前身体主诉（“最近心慌”）。
2. 只返回新的、有长期参考价值的短句（10字以内）。
3. 如果没有发现新信息，返回空数组。
4. 返回严格 JSON 格式：{"newInsights": ["...", "..."]}`;

        const prompt = `[现有画像]: ${currentInsights.join('; ')}\n[对话记录]:\n用户: ${userMessage}\n助手: ${assistantReply}`;

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${apiKey}`, 
                    "Content-Type": "application/json",
                    "X-Title": "FiveNursings-Memory"
                },
                body: JSON.stringify({
                    model: "google/gemini-3-flash-preview", // 使用低成本高速模型进行背景提取
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                }),
            });

            if (!response.ok) return currentInsights;

            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || "{}";
            const { newInsights = [] } = JSON.parse(rawContent);

            // 合并去重并限制条数（防止 context 过长）
            const merged = [...new Set([...currentInsights, ...newInsights])];
            return merged.slice(-15); // 保留最近 15 条最关键的画像
        } catch (e) {
            console.error("[MemoryService] Insight extraction failed:", e);
            return currentInsights;
        }
    }
}

module.exports = MemoryService;

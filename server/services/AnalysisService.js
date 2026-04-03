const fetch = require('node-fetch');

class AnalysisService {
    /**
     * 调用 OpenRouter AI 接口进行语义分析或总结
     * @param {string} prompt 
     * @param {Array} history 
     * @param {string} systemInstruction 
     * @param {boolean} jsonResponse 
     */
    static async callAI(prompt, history = [], systemInstruction = "", jsonResponse = false) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("API Key not configured");

        const messages = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        
        // 转换历史记录格式
        history.forEach(h => {
            if (h.text) messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text });
        });
        
        messages.push({ role: "user", content: prompt });

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${apiKey}`, 
                    "Content-Type": "application/json",
                    "X-Title": "FiveNursings-Module"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages,
                    response_format: jsonResponse ? { type: "json_object" } : undefined
                }),
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`AI API Error: ${response.status} ${errText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";
        } catch (e) {
            console.error("AI Service Error:", e);
            throw e;
        }
    }

    /**
     * 康复日记自动归档总结
     * @param {Array} history 
     * @param {Object} profile 
     */
    static async summarizeDiary(history, profile) {
        const context = `[患者背景] 类型：${profile?.cancerType}, 阶段：${profile?.stage}。
[对话记录]
${(history || []).map(h => `${h.role === 'model' ? '助手' : '患者'}: ${h.text}`).join('\n')}

请将上述对话总结为一条极简的康复日志条目（20字以内，用第一人称“今日...”开头）。
同时，请基于该记录为患者的核心指标打分增量（1-5分）。
请务必返回 JSON 格式：{"summary": "今日...", "impact": {"category": "diet|exercise|sleep|mental|function", "change": 3}}`;

        const content = await this.callAI(context, [], "你是一位专业的康复助理。", true);
        
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) {
            return { summary: "今日顺利完成康复记录", impact: { category: "mental", change: 1 } };
        }
    }

    /**
     * 生成每日健康简报
     * @param {Object} profile 
     */
    static async generateHealthReport(profile) {
        const prompt = `请基于以下患者档案生成一份【今日康复简报】。
患者昵称：${profile.nickname || '用户'}
诊断类型：${profile.cancerType}, 阶段：${profile.stage}
五养评分：饮食${profile.scores?.diet || 0}, 运动${profile.scores?.exercise || 0}, 睡眠${profile.scores?.sleep || 0}, 心理${profile.scores?.mental || 0}, 功能${profile.scores?.function || 0}

要求：
1. 采用 Markdown 格式，层级清晰。
2. 给出 1-2 条最核心的今日待办。
语气要温暖、鼓励，字数控制在 200 字左右。
3. 必须包含免责声明：本建议不构成医疗诊断。`;

        return await this.callAI(prompt, [], "你是一位专业的肿瘤康复AI教练。", false);
    }

    /**
     * AI 驱动的“五养”任务生成
     * @param {Object} profile 
     */
    static async generateAITasks(profile, date) {
        const prompt = `你是一位顶尖的肿瘤康复专家。请根据以下患者档案，为他制定【今日五养康复清单】。
患者：${profile.nickname || '用户'}, ${profile.gender}, ${profile.age}岁
病种：${profile.cancerType}, 治疗阶段：${profile.stage}
中医辨证：${profile.tcmAnalysisResult?.constitutionType || '待评估'}, ${profile.tcmAnalysisResult?.syndromeDifferentiation || '无'}
主诉症状：${profile.questionnaire?.chiefComplaint || '无'}
五养分数：饮食${profile.scores?.diet || 0}, 运动${profile.scores?.exercise || 0}, 睡眠${profile.scores?.sleep || 0}, 心理${profile.scores?.mental || 0}, 功能${profile.scores?.function || 0}

要求：
1. 必须覆盖“五养”维度：diet(饮食), exercise(运动), sleep(睡眠/膏方), mental(心理), function(机能)。
2. 生成 5-8 条任务。
3. 任务必须具有极强的针对性。例如气虚者应包含补气饮食或温和运动。
4. 返回严格的 JSON 数组格式，每个对象包含：
   - category: 以上五个维度之一
   - title: 任务名称（8字以内）
   - description: 核心康复价值说明（20字以内）
   - time: 建议执行时间 (HH:MM)
   - suggestedTimes: 另外3个可选的建议执行时间点, 数组格式 [HH:MM, HH:MM, HH:MM]
   - cycle: 建议周期 (如: 14天周期)
   - frequency: 频率，必须是 'daily', 'weekly', 或 'monthly' 之一 (例如: 作息、饮食任务通常是 'daily')

示例：[{"category": "diet", "title": "...", "description": "...", "time": "...", "suggestedTimes": ["08:00", "08:15", "08:30"], "cycle": "...", "frequency": "..."}]
只返回 JSON 数组，不要任何 Markdown 标记或多余文字。`;

        const content = await this.callAI(prompt, [], "你是一位严谨、专业的肿瘤康复AI教练。", true);
        
        try {
            // 清理可能的 Markdown 标记
            const cleanContent = content.replace(/```json|```/g, '').trim();
            const tasks = JSON.parse(cleanContent);
            return tasks.map(t => ({ ...t, date, completed: false }));
        } catch (e) {
            console.error("AI Task Parsing Error:", e, content);
            return null; // 返回 null 触发 Service 层的 Fallback
        }
    }
}

module.exports = AnalysisService;

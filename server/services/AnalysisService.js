const fetch = require('node-fetch');
const ContextService = require('./ContextService');
const KnowledgeService = require('./KnowledgeService');
const GeminiService = require('./GeminiService');

class AnalysisService {
    /**
     * 调用 OpenRouter AI 接口进行语义分析或总结
     * @param {string} prompt 
     * @param {Array} history 
     * @param {string} systemInstruction 
     * @param {boolean} jsonResponse 
     */
    static async callAI(prompt, history = [], systemInstruction = "", jsonResponse = false, fallbackModels = ["google/gemini-3-flash-preview", "qwen/qwen-2.5-72b-instruct"]) {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("API Key not configured");

        const messages = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        
        history.forEach(h => {
            if (h.text) messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text });
        });
        
        messages.push({ role: "user", content: prompt });

        let lastError = null;
        for (const model of fallbackModels) {
            try {
                console.log(`[Analysis AI] Attempting with model: ${model}`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${apiKey}`, 
                        "Content-Type": "application/json",
                        "X-Title": "FiveNursings-AnalysisService"
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        response_format: jsonResponse ? { type: "json_object" } : undefined
                    }),
                });
                
                if (!response.ok) {
                    const errText = await response.text();
                    console.warn(`[Analysis AI] Model ${model} failed (${response.status}): ${errText}`);
                    lastError = new Error(`AI API Error: ${response.status} ${errText}`);
                    continue; // Try next model
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                if (content) return content;
                
                lastError = new Error("Empty response from AI model");
            } catch (e) {
                console.error(`[Analysis AI] Network error for model ${model}:`, e);
                lastError = e;
            }
        }
        
        throw lastError || new Error("All AI models failed");
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
请务必返回 JSON 格式：{"summary": "今日...", "impact": {"category": "diet|exercise|mental|function|tcm", "change": 3}}`;

        try {
            // Using high-performance models for summary
            const content = await this.callAI(context, [], "你是一位专业的康复助理。", true, ["google/gemini-3-flash-preview", "qwen/qwen-2.5-72b-instruct"]);
            const cleanContent = content.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch (e) {
            console.error("[Summarize AI Error] Critical Failure:", e);
            return { summary: "今日顺利完成康复记录", impact: { category: "mental", change: 1 } };
        }
    }

    /**
     * 生成每日健康简报 (Expert Brain Edition)
     * @param {string} userId 
     * @param {Object} profile 
     */
    static async generateHealthReport(userId, profile) {
        // 1. 获取全维上下文
        const contextData = await ContextService.getFullContext(userId, profile) || {
            adherence: "今日暂无任务记录",
            currentSymptoms: "今日暂未上报明显症状",
            aiInsights: []
        };
        
        // 2. 检索理论依据
        const keywords = [profile?.cancerType || '', contextData?.currentSymptoms || ''];
        const knowledge = KnowledgeService.getRelevantTheory(keywords.join(' '));

        const prompt = `请作为【五养AI康复教练】，为患者 **${profile?.nickname || '用户'}** 生成一段温馨、专业且鼓励的今日康复简报。

[患者核心信息]
- 昵称：${profile?.nickname || '用户'}
- 类型：${profile?.cancerType || '待定'}
- 阶段：${profile?.stage || '待定'}
- 当前季节/天气：${contextData?.weatherInfo || '适宜康复'}

[昨日五养评分回顾] (请基于此数据进行点评)
- 功能养：${contextData?.scores?.function || 60}分
- 饮食养：${contextData?.scores?.diet || 60}分
- 运动养：${contextData?.scores?.exercise || 60}分
- 心理养：${contextData?.scores?.mental || 60}分
- 膏方养：${contextData?.scores?.sleep || 60}分

[今日执行摘要]
${contextData?.adherence || '今日暂无任务记录'}
${contextData?.currentSymptoms || '今日未上报明显症状'}

要求：
1. **结构必须严格包含**：
   - **问候语**：亲切地称呼用户。
   - **环境信息**：根据当前季节描述适宜康复的天气建议。
   - **昨日五养回顾**：逐一列出上述五个维度的评分并给出一两句针对性点评。
   - **核心行动建议**：今日最关键的一条建议。
2. **风格约束**：
   - 语气：专业、温暖、鼓励。
   - 字数：200字左右。
   - 格式：关键点使用双星号 ** 加粗（以便在界面上高亮显示）。
3. **不要**包含 Markdown 标题层级（如 # 或 ##），直接输出内容。`;

        const report = await this.callAI(prompt, [], "你是一位专业的五养AI康复教练，致力于为肿瘤患者提供温馨、科学的康复指导。", false);

        // --- TTS Upgrade: Generate Gemini Audio with specific voice ---
        let audioData = null;
        try {
            const voice = profile?.voicePreference || "Kore";
            console.log(`[AnalysisService] Generating report audio. userId: ${userId}, voice: ${voice}, profileKeys: ${Object.keys(profile || {})}`);
            
            // We use a simplified version of the report for TTS to ensure better pronunciation
            const ttsText = report
                .replace(/\*\*/g, '') // Remove bold
                .replace(/[#*`_~-]/g, ' ') // Remove other markdown symbols with spaces
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
            
            audioData = await GeminiService.generateAudio(ttsText, voice);
            console.log(`[AnalysisService] TTS Success for user ${userId} using voice ${voice}`);
        } catch (ttsErr) {
            console.error("[AnalysisService] TTS generation failed:", ttsErr);
        }

        return { report, audio: audioData };
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
1. 必须覆盖“五养”维度：diet(饮食), exercise(运动), tcm(膏方/睡眠), mental(心理), function(机能)。
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

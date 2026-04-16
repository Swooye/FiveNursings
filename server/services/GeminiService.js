const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
    constructor() {
        // 必须使用 Google AI Studio 原生 Key（AIza...），OpenRouter Key 不支持 TTS
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error("[GeminiService] CRITICAL: GOOGLE_API_KEY is missing from environment!");
        } else {
            console.log("[GeminiService] Authentication successful. TTS engine is ready.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey || "");
    }

    /**
     * 将 Gemini 返回的 PCM L16 raw audio 转换为标准 WAV 格式
     * 浏览器的 HTMLAudioElement 无法直接播放 audio/L16，必须加 WAV 头
     * @private
     */
    _pcmToWav(pcmBase64, sampleRate = 24000) {
        const pcmBuffer = Buffer.from(pcmBase64, 'base64');
        const numChannels = 1;   // Mono
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmBuffer.length;
        const wavBuffer = Buffer.alloc(44 + dataSize);

        wavBuffer.write('RIFF', 0);
        wavBuffer.writeUInt32LE(36 + dataSize, 4);      // Total size - 8
        wavBuffer.write('WAVE', 8);
        wavBuffer.write('fmt ', 12);
        wavBuffer.writeUInt32LE(16, 16);                // PCM fmt chunk size
        wavBuffer.writeUInt16LE(1, 20);                 // Audio format: PCM
        wavBuffer.writeUInt16LE(numChannels, 22);
        wavBuffer.writeUInt32LE(sampleRate, 24);
        wavBuffer.writeUInt32LE(byteRate, 28);
        wavBuffer.writeUInt16LE(blockAlign, 32);
        wavBuffer.writeUInt16LE(bitsPerSample, 34);
        wavBuffer.write('data', 36);
        wavBuffer.writeUInt32LE(dataSize, 40);
        pcmBuffer.copy(wavBuffer, 44);

        return wavBuffer.toString('base64');
    }

    /**
     * 使用 Gemini 2.5 Flash TTS 将文字转为语音
     * @param {string} text  要朗读的纯文本（已去除 Markdown）
     * @param {string} voice 声线名称，默认 "Kore"（中文友好）
     * @returns {Promise<string>}  WAV 音频的 base64 字符串
     */
    async generateAudio(text, voice = "Kore") {
        // 规范化音色：如果传入 'default' 或为空，则使用中文默认音色 'Kore'
        const targetVoice = (voice === 'default' || !voice) ? 'Kore' : voice;
        
        try {
            console.log(`[GeminiService] TTS starting | voice: ${targetVoice} (original: ${voice})`);
            // gemini-2.5-flash-preview-tts 是专用 TTS 模型，支持 responseModalities: ["audio"]
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash-preview-tts",
            });

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ["audio"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: targetVoice }
                        }
                    }
                }
            });

            const response = await result.response;
            const audioPart = response.candidates?.[0]?.content?.parts?.find(
                p => p.inlineData?.mimeType?.startsWith("audio/")
            );

            if (audioPart?.inlineData?.data) {
                const mimeType = audioPart.inlineData.mimeType;
                // Gemini 返回 audio/L16 (raw PCM)，浏览器无法直接播放，需转为 WAV
                if (mimeType.includes("L16") || mimeType.includes("pcm")) {
                    const sampleRate = parseInt(mimeType.match(/rate=(\d+)/)?.[1] || "24000");
                    return this._pcmToWav(audioPart.inlineData.data, sampleRate);
                }

                return audioPart.inlineData.data; // 其他格式直接返回
            }

            throw new Error("No audio data found in Gemini response");
        } catch (error) {
            console.error("[GeminiService] TTS failed:", error.message);
            throw error;
        }
    }
}

module.exports = new GeminiService();

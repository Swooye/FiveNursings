
import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile } from '../types';
import { Mic, Square, X, BrainCircuit, Volume2, Waves, PhoneCall } from 'lucide-react';
import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Tool, GenerativeModel, FunctionDeclaration, Part } from '@google/generative-ai';

const PROCESSING_STAGES = [
  "正在倾听您的反馈...",
  "深入理解您的语义...",
  "分析潜在的康复需求...",
  "正在组织更人性化的语言...",
  "即将为您提供回复..."
];

interface LiveVoiceAssistantProps {
  profile: PatientProfile;
  onClose: () => void;
  onConfirmLog: (log: string) => void;
  sessionId?: string | null;
  onSaveMessages?: (messages: { role: 'user' | 'model'; text: string }[]) => void;
  onMessageGenerated?: (msg: { role: 'user' | 'model'; text: string }) => void;
}

const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = (props) => {
  const { profile, onClose, onConfirmLog } = props;
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [sessionMessages, setSessionMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);

  const deepgramConnection = useRef<LiveClient | null>(null);
  const microphone = useRef<MediaRecorder | null>(null);
  const model = useRef<GenerativeModel | null>(null);
  const chat = useRef<any>(null); // Using 'any' for chat because the type is complex

  // Define function calling tools
  const recordLogFunction: FunctionDeclaration = {
    name: 'start_logging_intent',
    description: '当用户明确表示想要记录今天的健康状况、饮食、运动或想要把当前谈话内容存入日志/看板时调用。',
    parameters: {
      type: "OBJECT" as any,
      properties: {
        reason: { type: "STRING" as any, description: '用户想要记录的原因或提到的关键词' }
      }
    }
  };

  const tools: Tool[] = [{ functionDeclarations: [recordLogFunction] }];

  // Initialize and clean up Deepgram connection
  useEffect(() => {
    const initialize = async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI((import.meta as any).env.VITE_GEMINI_API_KEY);
      model.current = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    };
    initialize();

    return () => {
      stopSession();
    };
  }, []);

  // Handle stage cycle animation when processing
  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setProcessingStage((prev) => (prev + 1) % PROCESSING_STAGES.length);
      }, 1500);
    } else {
      setProcessingStage(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const startSession = async () => {
    if (isListening || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stream) {
        console.error("No audio stream found.");
        return;
      }

      const apiKey = (import.meta as any).env.VITE_DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error("Deepgram API Key not found.");
        return;
      }

      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'zh-CN',
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
      });

      connection.on(LiveTranscriptionEvents.Open, () => {
        microphone.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        microphone.current.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        };
        microphone.current.start(250);
        setIsListening(true);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const sentence = data.channel.alternatives[0].transcript;
        if (data.is_final) {
          setTranscript(prev => `${prev} ${sentence}`.trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(sentence);
        }
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
        if (transcript.trim()) {
          const textToSend = transcript.trim();
          const msg = { role: 'user' as const, text: textToSend };
          setSessionMessages(prev => [...prev, msg]);
          if (props.onMessageGenerated) props.onMessageGenerated(msg);
          await getAIResponse(textToSend);
        }
      });

      connection.on(LiveTranscriptionEvents.Close, () => console.log("Deepgram connection closed."));
      connection.on(LiveTranscriptionEvents.Error, (e) => console.error("Deepgram error:", e));

      deepgramConnection.current = connection;
    } catch (error) {
      console.error("Failed to start voice session:", error);
    }
  };

  const getAIResponse = async (text: string) => {
    if (!model.current) return;

    setIsListening(false);
    setIsProcessing(true);

    try {
      if (!chat.current) {
        chat.current = model.current.startChat({
          tools,
          history: [],
          systemInstruction: `
             你是一个顶级的、富有同情心的 AI 康复教练，名叫“五养教练”。你的主要职责是与癌症康复期患者进行开放式、支持性的对话，并帮助他们记录健康日志。
             - 你的沟通风格必须是：友好、耐心、积极、充满鼓励，像一个真实的朋友。
             - **核心任务**：倾听用户的任何想法，无论是关于他们当天的感受、饮食、运动、睡眠、情绪，还是任何生活琐事。
             - **日志记录**：当用户在谈话中明确表达了想要“记录”或“记一下”今天的状况时（例如“我想记录一下今天吃了什么”或“帮我记一下今天感觉不错”），你必须调用 'start_logging_intent' 函数。在调用函数时，要在 'reason' 参数中简要说明用户想要记录的原因。
             - **禁止行为**：绝对不能提供 any 医疗建议、诊断或治疗方案。如果被问到，必须委婉地拒绝并说明“我只是一个负责陪伴和记录的AI助手，任何医疗问题都需要咨询您的医生或专业康复师。”
             - **用户信息**：你知道当前用户是 ${profile.name}，${profile.age}岁，正在进行 ${profile.cancerType || '相关'} 的康复。请在对话中适当地、自然地体现出你了解这些背景信息，让用户感到被专属服务。
             - **简化互动**：你的回答应该简洁明了，易于理解。
            `
        });
      }

      const result = await chat.current.sendMessage(text);
      const response = result.response;
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'start_logging_intent') {
          const fullLog = `${transcript} - ${aiResponse}`.trim();
          onConfirmLog(fullLog);
        }
      } else {
        const aiText = response.text();
        setAiResponse(aiText);
        const msg = { role: 'model' as const, text: aiText };
        setSessionMessages(prev => [...prev, msg]);
        if (props.onMessageGenerated) props.onMessageGenerated(msg);
        speakResponse(aiText);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = "抱歉，我的大脑好像断线了，请稍后再试。";
      setAiResponse(errorMessage);
      speakResponse(errorMessage);
    } finally {
      setIsProcessing(false);
      setTranscript('');
      setAiResponse('');
    }
  };

  const stripMarkdown = (text: string) => {
    return text
      .replace(/[#*`_~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/>+/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  };

  const speakResponse = (text: string) => {
    const cleanText = stripMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    const voiceName = profile.voicePreference;

    if (voiceName && voiceName !== 'default') {
      selectedVoice = voices.find(v => v.name === voiceName);
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(v =>
        v.name.includes('Google') &&
        (v.name.includes('普通话') || v.name.includes('Mandarin')) &&
        (v.lang.includes('zh') || v.lang.includes('CN'))
      );
    }

    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => {
      // Potentially restart listening after AI speaks
      startSession();
    };
    speechSynthesis.speak(utterance);
  };

  const stopSession = (shouldSave = false) => {
    if (microphone.current) {
      microphone.current.stop();
      microphone.current = null;
    }
    if (deepgramConnection.current) {
      deepgramConnection.current.finish();
      deepgramConnection.current = null;
    }
    speechSynthesis.cancel();

    if (shouldSave && sessionMessages.length > 0 && props.onSaveMessages) {
      props.onSaveMessages(sessionMessages);
    }

    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setInterimTranscript('');
    setAiResponse('');
  };


  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []);

  return (
    <div className="fixed inset-0 bg-[#161d2b] z-[200] flex flex-col items-center justify-between py-16 animate-in fade-in duration-500 overflow-hidden">
      {/* Top Badge */}
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-2 px-6 py-2 bg-emerald-900/40 rounded-full border border-emerald-500/30 text-emerald-400 font-bold">
          <PhoneCall size={16} />
          <span className="text-[10px] font-black tracking-widest uppercase">五养教练服务中</span>
        </div>
      </div>

      {/* Center UI */}
      <div className="flex flex-col items-center flex-1 justify-center w-full px-12">
        <div className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${isListening ? 'bg-emerald-600 shadow-[0_0_80px_rgba(16,185,129,0.4)]' : 'bg-emerald-500/20'}`}>
          <div className={`absolute inset-0 rounded-full border-2 border-emerald-400/20 ${isListening ? 'animate-ping' : ''}`}></div>
          <Mic size={80} className="text-white relative z-10" />

          {/* Waves Effect */}
          {isListening && (
            <div className="absolute -bottom-8 flex items-end space-x-1 h-12">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 text-center space-y-4 max-w-sm">
          <h2 className="text-3xl font-black text-white leading-tight">向教练倾诉您的心情</h2>
          <p className="text-slate-400 text-lg font-bold italic leading-relaxed">
            “{isProcessing ? aiResponse : (transcript || interimTranscript || '教练，我今天感觉心情有点沉重，该怎么办？')}”
          </p>
        </div>
      </div>

      {/* Bottom Progress/Controls */}
      <div className="w-full px-12 space-y-10 flex flex-col items-center">
        <div className="w-full max-w-sm bg-slate-800/40 rounded-[32px] p-8 border border-slate-700/30">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expert Insight Level</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-2/3 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          </div>
          <div className="flex items-center space-x-4 mt-6">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-400">
              <Volume2 size={24} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-2 bg-slate-700 rounded-full w-full"></div>
              <div className="h-2 bg-slate-700 rounded-full w-3/4 opacity-50"></div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { stopSession(true); props.onClose(); }}
          className="w-full max-w-[200px] h-16 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center space-x-3 text-white font-black transition-all active:scale-95 border border-slate-700"
        >
          <X size={20} />
          <span>结束对话</span>
        </button>
      </div>

    </div>
  );
};

export default LiveVoiceAssistant;

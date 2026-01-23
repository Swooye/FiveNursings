
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Volume2, Save, Sparkles, CheckCircle2, MessageCircle, ClipboardEdit, Loader2, Cpu, Database, Zap, UserCheck, PhoneCall } from 'lucide-react';
import { VoiceLog } from '../types';

// Implementation of manually defined encode/decode helpers
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface LiveVoiceAssistantProps {
  mode: 'chat' | 'logging';
  onClose: (newLog?: VoiceLog) => void;
}

const PROCESSING_STAGES = [
  { label: '正在整理您的口述...', icon: <MessageCircle size={14} /> },
  { label: '林教练深度分析中...', icon: <Cpu size={14} /> },
  { label: '同步数据至健康档案...', icon: <Database size={14} /> },
  { label: '正在生成康复建议...', icon: <Zap size={14} /> }
];

const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = ({ mode, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [isLoggingActive, setIsLoggingActive] = useState(mode === 'logging');
  
  const fullSessionTranscriptionRef = useRef<string>('');
  const currentTurnInputRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

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

  // 定义函数调用，用于识别闲聊中的录入意图
  const recordLogFunction: FunctionDeclaration = {
    name: 'start_logging_intent',
    description: '当用户明确表示想要记录今天的健康状况、饮食、运动或想要把当前谈话内容存入日志/看板时调用。',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: '用户想要记录的原因或提到的关键词' }
      }
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const systemInstruction = mode === 'logging' 
      ? `你是一位专业且温暖的康复教练。
当前任务：协助用户完成“五养日志”录入。
流程：请主动引导用户谈论今天的饮食、运动、睡眠、心理状态或身体功能。
语气：鼓励、耐心、专业。`
      : `你是一位温和专业的肿瘤康复教练。
当前任务：与用户进行日常康复咨询或心理疏导。
原则：不要主动索要数据。只需回答疑问、提供情绪支持和健康知识。
例外：如果用户提到“帮我记录一下”、“存入看板”等类似录入意图，请调用 start_logging_intent 函数，并告诉用户你已经准备好为他记录了。`;

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          setIsConnecting(false);
          setIsActive(true);
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'start_logging_intent') {
                setIsLoggingActive(true);
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: "ok, logging mode enabled" } }
                }));
              }
            }
          }

          if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            currentTurnInputRef.current += text;
            setTranscription(prev => prev + text);
          }

          if (message.serverContent?.turnComplete) {
            if (currentTurnInputRef.current.trim().length > 0) {
              fullSessionTranscriptionRef.current += (fullSessionTranscriptionRef.current ? ' ' : '') + currentTurnInputRef.current.trim();
            }
            currentTurnInputRef.current = '';
            setTranscription('');
            setIsProcessing(true);
          }

          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData && outputAudioContextRef.current) {
            setIsProcessing(false);
            const ctx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.addEventListener('ended', () => sourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.add(source);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setIsProcessing(false);
          }
        },
        onerror: (e) => {
          console.error("Live Error:", e);
          setIsProcessing(false);
        },
        onclose: () => {
          setIsActive(false);
          setIsConnecting(false);
          setIsProcessing(false);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        tools: [{ functionDeclarations: [recordLogFunction] }],
        systemInstruction: systemInstruction,
        inputAudioTranscription: {}, 
        outputAudioTranscription: {},
      }
    });

    sessionRef.current = await sessionPromise;
  };

  const handleStop = () => {
    let finalLog: VoiceLog | undefined = undefined;
    const sessionText = fullSessionTranscriptionRef.current || currentTurnInputRef.current;
    
    if (isLoggingActive && sessionText && sessionText.trim().length > 2) {
      finalLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        summary: sessionText.length > 100 ? sessionText.substring(0, 100) + '...' : sessionText,
        impact: {
            category: 'exercise', 
            change: 3
        }
      };
    }

    if (sessionRef.current) sessionRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setIsActive(false);
    onClose(finalLog);
  };

  useEffect(() => {
    startSession();
    return () => {
        if (sessionRef.current) sessionRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-white transition-all duration-700">
      <button 
        onClick={handleStop}
        className="absolute top-10 right-8 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all border border-white/5 active:scale-90"
      >
        <X size={24} />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12 w-full max-w-sm">
        {/* Mode Indicator */}
        <div className="flex flex-col items-center space-y-2">
          {isLoggingActive ? (
            <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-400/10 px-5 py-2 rounded-full border border-emerald-400/20 animate-in fade-in zoom-in duration-500 shadow-lg shadow-emerald-500/5">
              <ClipboardEdit size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">正在录入康复日志</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-blue-400 bg-blue-400/10 px-5 py-2 rounded-full border border-blue-400/20 shadow-lg shadow-blue-500/5">
              <PhoneCall size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">专家连线服务中</span>
            </div>
          )}
        </div>

        {/* Central Visual Element */}
        <div className="relative group">
          <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 ${
            isActive ? (isLoggingActive ? 'bg-emerald-500' : 'bg-blue-500') + ' shadow-[0_0_80px_rgba(16,185,129,0.3)]' : 'bg-slate-700 shadow-inner'
          } ${isProcessing ? 'animate-pulse scale-95 opacity-80' : 'scale-110'}`}>
            {isProcessing ? (
              <Sparkles size={48} className="text-white animate-spin duration-slow" />
            ) : (
              <Mic size={48} className={isActive ? "animate-bounce duration-slow" : "text-slate-400"} />
            )}
          </div>
          
          {/* Animated Background Rings */}
          {isActive && (
            <>
              <div className={`absolute inset-0 rounded-full border-2 ${isLoggingActive ? 'border-emerald-500/30' : 'border-blue-500/30'} animate-ping duration-[3s]`}></div>
              <div className={`absolute inset-0 rounded-full border-2 ${isLoggingActive ? 'border-emerald-500/20' : 'border-blue-500/20'} animate-ping duration-[2s] [animation-delay:0.5s]`}></div>
              {isProcessing && (
                <div className="absolute -inset-8 border border-white/5 rounded-full animate-spin duration-[8s] opacity-20"></div>
              )}
            </>
          )}
        </div>

        {/* Text Area */}
        <div className="text-center space-y-6 w-full h-32 flex flex-col items-center justify-center">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h2 className="text-2xl font-black tracking-tight mb-2">
              {isConnecting ? '正在连接康复专家...' : 
                isProcessing ? '林教练深度分析中' :
                (isActive ? (isLoggingActive ? '记录您的康复动态' : '向专家倾诉您的心情') : '助手已就绪')}
            </h2>
            
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2 text-emerald-400/80 font-bold text-xs bg-white/5 px-4 py-1.5 rounded-full border border-white/5 animate-pulse">
                {PROCESSING_STAGES[processingStage].icon}
                <span className="tracking-wide transition-all duration-500">
                  {PROCESSING_STAGES[processingStage].label}
                </span>
              </div>
            ) : (
              <p className="text-slate-400 text-sm px-8 leading-relaxed font-medium italic transition-all duration-500">
                {transcription || (isLoggingActive ? "“今天中午我吃得比较有食欲，还散步了十分钟...”" : "“林教练，我今天感觉心情有点沉重，该怎么办？”")}
              </p>
            )}
          </div>
        </div>

        {/* Visual Progress/Level Bar */}
        <div className="w-full bg-white/5 rounded-[32px] p-8 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
          
          <div className="flex items-center space-x-5">
            <div className={`w-12 h-12 ${isLoggingActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'} rounded-2xl flex items-center justify-center shadow-inner`}>
              {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Volume2 size={24} />}
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                <span>Expert Insight Level</span>
                <span>{isProcessing ? 'Processing...' : (isActive ? 'Active' : 'Standby')}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isLoggingActive ? 'bg-emerald-500' : 'bg-blue-500'
                  } ${isProcessing ? 'w-full animate-pulse' : (isActive ? 'w-2/3' : 'w-1/12')}`}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className="pb-10">
        <button 
          onClick={handleStop}
          className={`px-14 py-5 rounded-[28px] font-black text-sm shadow-2xl transition-all active:scale-95 flex items-center space-x-3 border border-white/10 ${
            isLoggingActive 
            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
            : 'bg-slate-800 hover:bg-slate-700'
          }`}
        >
          {isLoggingActive ? <Save size={18} /> : <X size={18} />}
          <span>{isLoggingActive ? '保存日志并退出' : '结束对话'}</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes duration-slow {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .duration-slow {
          animation: duration-slow 2s infinite alternate ease-in-out;
        }
      `}} />
    </div>
  );
};

export default LiveVoiceAssistant;

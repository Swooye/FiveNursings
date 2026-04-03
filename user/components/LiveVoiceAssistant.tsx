
import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile } from '../types';
import { Mic, X, Volume2, PhoneCall, Activity, AlertCircle } from 'lucide-react';
import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const API_URL = import.meta.env.DEV ? "" : "https://us-central1-fivenursings-73917017-a0dfd.cloudfunctions.net/api";

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
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [sessionMessages, setSessionMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // States for Volume/Mute/AI Speaking
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Use refs for values accessed in closures to avoid stale state
  const isMutedRef = useRef(false);
  const isAiSpeakingRef = useRef(false);

  const deepgramConnection = useRef<LiveClient | null>(null);
  const microphone = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const allStreams = useRef<MediaStream[]>([]);
  const isSessionActive = useRef<boolean>(false);
  const conversationHistory = useRef<{ role: 'user' | 'model'; text: string }[]>([]);
  // Ref-based transcript to avoid React state batching issues
  const transcriptRef = useRef('');
  const isProcessingRef = useRef(false);  // Mutex to prevent duplicate AI requests
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);

  useEffect(() => {
    isSessionActive.current = true;
    // Pre-load voices for speech synthesis
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    startSession();
    return () => stopSession();
  }, []);

  const updateVolume = () => {
    if (!analyser.current) return;
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
    const average = sum / dataArray.length;
    setVolumeLevel(Math.min(100, (average / 80) * 100));
    animationFrame.current = requestAnimationFrame(updateVolume);
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.current.state === 'suspended') audioContext.current.resume();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser.current);
      updateVolume();
    } catch (e) { console.error("Audio analysis setup failed", e); }
  };

  // Interrupt AI speech when user starts talking
  const interruptAiSpeech = () => {
    if (isAiSpeakingRef.current) {
      console.log("[Voice] User interrupted AI speech");
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      setAiResponse('');
    }
  };

  const startSession = async () => {
    if (!isSessionActive.current) return; // Guard: don't restart after stopSession
    if (isListening || isProcessingRef.current || isAiSpeaking) return;
    try {
      // Stop any existing stream tracks before creating a new one
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      allStreams.current.push(stream);
      const apiKey = (import.meta as any).env.VITE_DEEPGRAM_API_KEY;
      if (!apiKey) {
        setError("未检测到语音识别密钥 (Deepgram Key)，请在 .env 中补充 VITE_DEEPGRAM_API_KEY 后重启服务。");
        return;
      }

      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: 'nova-2', language: 'zh-CN', smart_format: true,
        interim_results: true, endpointing: 300, utterance_end_ms: 1000,
      });

      connection.on(LiveTranscriptionEvents.Open, () => {
        microphone.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        microphone.current.ondataavailable = (event) => {
          // Always send audio (even during AI speech) to enable interruption detection
          if (!isMutedRef.current && event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        };
        microphone.current.start(250);
        setupAudioAnalysis(stream);
        setIsListening(true);
        setError(null);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const sentence = data.channel.alternatives[0].transcript;
        if (!sentence) return;  // Skip empty transcripts

        if (data.is_final) {
          // If user is speaking while AI talks, interrupt immediately
          if (isAiSpeakingRef.current && sentence.trim()) {
            interruptAiSpeech();
          }
          transcriptRef.current = `${transcriptRef.current} ${sentence}`.trim();
          setTranscript(transcriptRef.current);
          setInterimTranscript('');
        } else {
          // Interim transcript detected while AI speaking = interrupt
          if (isAiSpeakingRef.current && sentence.trim()) {
            interruptAiSpeech();
          }
          setInterimTranscript(sentence);
        }
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
        if (isMutedRef.current) return;
        // If AI was speaking and user interrupted, the transcript will be processed here

        // Mutex: prevent duplicate processing
        if (isProcessingRef.current) return;

        const textToSend = transcriptRef.current.trim();
        if (!textToSend) return;

        // Clear transcript immediately and acquire mutex
        transcriptRef.current = '';
        setTranscript('');
        isProcessingRef.current = true;

        console.log("[Voice] Utterance complete, sending:", textToSend);
        const msg = { role: 'user' as const, text: textToSend };
        setSessionMessages(prev => [...prev, msg]);
        conversationHistory.current.push(msg);
        if (props.onMessageGenerated) props.onMessageGenerated(msg);
        getAIResponse(textToSend);
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error("Deepgram error:", err);
        setError("语音识别连接异常，正在重试...");
      });

      deepgramConnection.current = connection;
    } catch (error: any) {
      console.error("Voice start error:", error);
      setError("无法访问麦克风，请确保浏览器已授权录音权限。");
    }
  };

  const getAIResponse = async (text: string) => {
    setIsListening(false);
    setIsProcessing(true);
    setAiResponse('教练正在思考...');
    try {
      console.log("[Voice] Sending to backend:", text);
      const res = await fetch(`${API_URL}/get-ai-chat-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          profile,
          history: conversationHistory.current.slice(-6)
        })
      });

      if (!res.ok) {
        throw new Error(`服务端返回 ${res.status}`);
      }

      const data = await res.json();
      const aiText = data.reply;

      if (!aiText) {
        throw new Error("AI 返回了空回复");
      }

      if (!isSessionActive.current) return;

      console.log("[Voice] AI replied:", aiText.substring(0, 80));
      setAiResponse(aiText);
      const msg = { role: 'model' as const, text: aiText };
      setSessionMessages(prev => [...prev, msg]);
      conversationHistory.current.push(msg);
      if (props.onMessageGenerated) props.onMessageGenerated(msg);

      setIsProcessing(false);
      isProcessingRef.current = false;
      speakResponse(aiText);
    } catch (e: any) {
      console.error("[Voice] AI response error:", e);
      setError(`AI 回复失败: ${e.message}`);
      setIsProcessing(false);
      isProcessingRef.current = false;
      setAiResponse('');
      // Resume listening after error (only if session is still active)
      if (isSessionActive.current) {
        retryTimeoutRef.current = setTimeout(() => {
          if (!isSessionActive.current) return;
          setError(null);
          startSession();
        }, 3000);
      }
    }
  };

  const speakResponse = (text: string) => {
    try {
      // Strip markdown for cleaner TTS
      const cleanText = text
        .replace(/[#*`~>]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
        .replace(/\n+/g, '。')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice: SpeechSynthesisVoice | null = null;
      const voicePref = profile?.voicePreference || 'default';

      if (voicePref !== 'default' && voicePref !== '') {
        selectedVoice = voices.find(v => v.name === voicePref) || null;
        if (!selectedVoice) {
          const lowerPref = voicePref.toLowerCase();
          selectedVoice = voices.find(v => v.name.toLowerCase().includes(lowerPref)) || null;
        }
      }

      if (!selectedVoice || voicePref === 'default' || voicePref === '') {
        selectedVoice = voices.find(v => v.name.includes('Google') && (v.name.includes('普通话') || v.name.includes('Mandarin'))) || null;
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('zh-CN')) || voices.find(v => v.lang.includes('zh')) || null;
      }

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => {
        setIsAiSpeaking(true);
        isAiSpeakingRef.current = true;
      };
      utterance.onend = () => {
        if (!isSessionActive.current) return;
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        setAiResponse('');
        // Don't call startSession here — mic is already running for interruption
        setIsListening(true);
      };
      utterance.onerror = (event) => {
        console.error("Speech error event:", event);
        if (!isSessionActive.current) return;
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        setAiResponse('');
        setIsListening(true);
      };
      console.log("[Voice] Speaking with voice:", selectedVoice?.name || 'default');
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech error", e);
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      setAiResponse('');
      if (isSessionActive.current) startSession();
    }
  };

  const stopSession = () => {
    isSessionActive.current = false;
    // Cancel any pending retry timeout to prevent re-acquiring microphone
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    try {
      if (microphone.current && microphone.current.state !== 'inactive') {
        microphone.current.stop();
      }
      // Stop ALL streams, not just the latest one
      allStreams.current.forEach(stream => {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log("[Voice] Stopped track:", track.label, track.readyState);
        });
      });
      allStreams.current = [];
      mediaStream.current = null;
      if (deepgramConnection.current) {
        deepgramConnection.current.finish();
        deepgramConnection.current = null;
      }
      if (audioContext.current) {
        audioContext.current.close().catch(e => console.error("AudioContext close error", e));
        audioContext.current = null;
      }
      window.speechSynthesis.cancel();
    } catch (e) { console.error("Stop session error", e); }
    setIsListening(false);
    setIsProcessing(false);
    setIsAiSpeaking(false);
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
  };

  return (
    <div className="fixed inset-0 bg-[#0B0F1A] z-[200] flex flex-col items-center justify-between py-6 animate-in fade-in duration-500 overflow-hidden font-outfit">
      {/* Top Header */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2 px-6 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/20 text-emerald-400 font-bold backdrop-blur-md">
          <PhoneCall size={14} className="animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-black">通话中</span>
        </div>

      </div>

      {/* Center Mic Area */}
      <div className="flex flex-col items-center justify-center flex-1 w-full px-12 -mt-4">
        <div className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-all duration-700 ${isAiSpeaking ? 'bg-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.4)]' : (isListening && !isMuted ? 'bg-emerald-500/10 shadow-[0_0_60px_rgba(16,185,129,0.1)] scale-105' : 'bg-slate-800/10')}`}>
          {isAiSpeaking && (
            <>
              <div className="ripple-circle" style={{ animationDelay: '0s' }}></div>
              <div className="ripple-circle" style={{ animationDelay: '1s' }}></div>
              <div className="ripple-circle" style={{ animationDelay: '2s' }}></div>
            </>
          )}
          <div className={`absolute inset-0 rounded-full border-2 ${isAiSpeaking ? 'border-emerald-400/40 opacity-0' : 'border-emerald-400/5'} ${(isListening && !isMuted && !isAiSpeaking) ? 'animate-pulse scale-110' : ''}`}></div>
          <div className={`w-48 h-48 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-500 ${isAiSpeaking ? 'bg-emerald-400/20' : 'border border-white/5'}`}>
            <Mic size={72} className={`transition-all duration-500 ${isAiSpeaking ? 'text-white scale-110' : (isListening && !isMuted ? 'text-white' : 'text-slate-700')}`} />
          </div>
        </div>

        <div className="mt-8 text-center space-y-3 max-w-sm px-6">
          <h2 className="text-xl font-black text-white leading-tight">向教练倾诉您的心情</h2>
          <div className="min-h-[60px] flex items-center justify-center text-center">
            <p className="text-slate-400/60 text-sm font-bold italic leading-relaxed">
              "{error ? error : (isProcessing ? (aiResponse || '教练正在根据您的反馈深入思考...') : (transcript || interimTranscript || '直接说话即可，教练正在专注倾听...'))}"
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Control Card */}
      <div className="w-full px-6 pb-6 space-y-4 flex flex-col items-center">
        <div className="w-full max-w-sm bg-[#161d2b]/70 backdrop-blur-3xl rounded-[32px] p-6 border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center mb-5 px-1">
            <span className="text-[9px] font-black text-slate-500 tracking-[0.15em]">专家深度分析</span>
            <span className={`text-[9px] font-black tracking-[0.15em] flex items-center ${isListening ? 'text-emerald-400' : 'text-slate-600'}`}>
              {isListening ? '运行中' : (error ? '异常' : '待机中')}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Horn Icon (Green Tone) - Moved to Left */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${isMuted ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}
            >
              <Volume2 size={20} />
            </button>

            <div className="flex-1 h-1 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-75 ${error ? 'bg-rose-500/30' : (isMuted ? 'bg-slate-700 w-[66%]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]')}`}
                style={{ width: error ? '100%' : (isMuted ? '66%' : `${Math.max(10, volumeLevel)}%`) }}
              ></div>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-slate-500 font-bold tracking-tight text-center">
            {error ? '服务异常，请核对环境配置' : (isMuted ? '已暂停采音，请点击左侧图标恢复' : '语音服务已就绪，教练正在分析您的语音...')}
          </div>
        </div>

        <button
          onClick={() => { stopSession(); onClose(); }}
          className="w-full max-w-[160px] h-14 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center space-x-2 text-white/50 font-black border border-white/5 text-xs transition-all active:scale-95"
        >
          <X size={16} />
          <span>结束通话</span>
        </button>
      </div>

      {/* Floating Error Badge */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-rose-500/90 rounded-2xl flex items-center space-x-3 shadow-xl backdrop-blur-lg animate-in slide-in-from-top-4 duration-300">
          <AlertCircle size={18} className="text-white shrink-0" />
          <span className="text-[11px] text-white font-bold leading-tight">{error}</span>
        </div>
      )}
    </div>
  );
};

export default LiveVoiceAssistant;

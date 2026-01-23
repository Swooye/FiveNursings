
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { X, Volume2, Sparkles, Activity, Play, Pause, RotateCcw, RotateCw, ChevronRight } from 'lucide-react';
import { PatientProfile } from '../types';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  
  view.setUint32(12, 0x666d7420, false); 
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  
  view.setUint32(36, 0x64617461, false); 
  view.setUint32(40, pcmData.length, true);
  
  return new Blob([header, pcmData], { type: 'audio/wav' });
}

const ReportMarkdown: React.FC<{ text: string; active: boolean }> = ({ text, active }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <div className={`transition-all duration-500 leading-relaxed px-4 py-2 rounded-2xl ${
      active 
      ? 'bg-emerald-500/15 text-white scale-[1.03] shadow-[0_8px_20px_rgba(16,185,129,0.1)] opacity-100 translate-x-1' 
      : 'text-slate-400 opacity-25 blur-[0.4px] scale-[0.98]'
    }`}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <strong key={i} className={`font-black transition-colors duration-500 ${
              active ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-300'
            }`}>
              {boldText}
            </strong>
          );
        }
        return <span key={i} className="font-medium tracking-tight">{part}</span>;
      })}
    </div>
  );
};

interface DailyHealthReportProps {
  profile: PatientProfile;
  onClose: () => void;
}

const DailyHealthReport: React.FC<DailyHealthReportProps> = ({ profile, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  const sentences = useMemo(() => {
    if (!reportText) return [];
    const punctuation = /[。！？；.!?;]|\n/;
    return reportText
      .split(/([。！？；.!?;]|\n)/g)
      .reduce((acc: string[], cur: string) => {
        if (!cur) return acc;
        if (punctuation.test(cur)) {
          if (acc.length > 0) acc[acc.length - 1] += cur;
          else acc.push(cur);
        } else {
          acc.push(cur);
        }
        return acc;
      }, [])
      .filter(s => s.trim().length > 0);
  }, [reportText]);

  const timedSentences = useMemo(() => {
    if (duration === 0 || sentences.length === 0) return [];
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    let accumulatedTime = 0;
    
    return sentences.map(s => {
      const startTime = accumulatedTime;
      const sentenceDuration = (s.length / totalChars) * duration;
      accumulatedTime += sentenceDuration;
      return { text: s, start: startTime, end: accumulatedTime };
    });
  }, [sentences, duration]);

  const activeIndex = timedSentences.findIndex(s => currentTime >= s.start && currentTime < s.end);

  useEffect(() => {
    if (activeIndex !== -1 && sentenceRefs.current[activeIndex]) {
      sentenceRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex]);

  const generateReport = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `你是五养AI康复教练。请为${profile.name}生成一段温馨的今日康复简报。
      包含：
      1. 早上好/晚上好问候。
      2. 基于五养指标（饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}）给出评价。
      3. 给出今日最核心的 **加粗康复建议**。
      语气：优雅、沉稳、充满希望。字数150-200字。在重要建议上必须使用 **双星号** 加粗。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      const narrative = response.text || "准备中...";
      setReportText(narrative);

      const cleanNarrative = narrative.replace(/\*\*/g, '');
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `收听简报：${cleanNarrative}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const pcmBytes = decode(base64Audio);
        const wavBlob = pcmToWav(pcmBytes, 24000);
        const audioUrl = URL.createObjectURL(wavBlob);
        
        const audio = new Audio();
        audio.src = audioUrl;
        audioRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
        audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
        audio.addEventListener('ended', () => setIsPlaying(false));
        
        audio.load();
        audio.play().then(() => setIsPlaying(true)).catch(e => {
          console.warn("Autoplay was prevented:", e);
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Report Generation Error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
      <button onClick={onClose} className="absolute top-10 right-8 p-3 bg-white/5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5">
        <X size={24} />
      </button>

      <div className="w-full max-w-sm flex flex-col items-center space-y-12">
        <div className="relative">
          <div className={`w-40 h-40 rounded-full bg-emerald-500/10 flex items-center justify-center transition-all duration-1000 ${isPlaying ? 'scale-110' : 'scale-90 opacity-40'}`}>
            <Volume2 size={56} className={`text-emerald-400 transition-all ${isPlaying ? 'animate-pulse' : ''}`} />
            {isPlaying && [0.2, 0.5, 0.8].map((delay, idx) => (
              <div key={idx} className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ping" style={{ animationDelay: `${delay}s` }}></div>
            ))}
          </div>
        </div>

        <div className="w-full bg-white/5 backdrop-blur-3xl rounded-[48px] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Health Journal Audio</span>
            </div>
            <Sparkles size={16} className="text-white/20" />
          </div>

          {loading ? (
            <div className="space-y-6 py-10">
              <div className="h-2 bg-white/5 rounded-full w-4/5 animate-pulse"></div>
              <div className="h-2 bg-white/5 rounded-full w-full animate-pulse"></div>
              <div className="h-2 bg-white/5 rounded-full w-3/4 animate-pulse"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div 
                ref={scrollContainerRef}
                className="h-[240px] overflow-y-auto pr-2 custom-scrollbar space-y-4 relative"
              >
                <div className="sticky top-0 h-10 bg-gradient-to-b from-slate-950/0 to-transparent pointer-events-none z-10"></div>
                {timedSentences.map((s, i) => (
                  <div 
                    key={i} 
                    ref={el => { sentenceRefs.current[i] = el; }}
                    className="transition-all duration-500"
                  >
                    <ReportMarkdown text={s.text} active={i === activeIndex} />
                  </div>
                ))}
                <div className="h-24"></div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-6">
                <div className="flex items-center space-x-6 justify-center">
                  <button onClick={() => seek(-15)} className="text-white/30 hover:text-emerald-400 transition-colors"><RotateCcw size={24} /></button>
                  <button 
                    onClick={togglePlay} 
                    className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-500/20 active:scale-90 transition-all hover:bg-emerald-400"
                  >
                    {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                  </button>
                  <button onClick={() => seek(15)} className="text-white/30 hover:text-emerald-400 transition-colors"><RotateCw size={24} /></button>
                </div>
                
                <div className="flex justify-between items-center px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Date Report</span>
                    <span className="text-xs font-bold text-slate-500">{new Date().toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full">
                    <Activity size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">AI Analyzed</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 opacity-20">
          <div className="w-1 h-1 rounded-full bg-white"></div>
          <div className="w-8 h-px bg-white/50"></div>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white">Daily Resilience</p>
          <div className="w-8 h-px bg-white/50"></div>
          <div className="w-1 h-1 rounded-full bg-white"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.3); }
        .blur-gradient-top { mask-image: linear-gradient(to bottom, transparent, black 20%); }
      `}} />
    </div>
  );
};

export default DailyHealthReport;

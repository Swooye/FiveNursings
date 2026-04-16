import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Volume2, Sparkles, Play, Pause, RotateCcw, RotateCw } from 'lucide-react';
import { auth } from '../src/firebase';
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
  onStartVoice?: () => void;
  onUpdateCache?: (cache: any) => void;
  cache?: any;
}

const API_URL = import.meta.env.PROD ? "" : "http://localhost:3002";

const DailyHealthReport: React.FC<DailyHealthReportProps> = ({ profile, onClose, onStartVoice }) => {
  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMounted = useRef(true);
  const audioUrlRef = useRef<string | null>(null);

  const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

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
    const effectiveDuration = duration || (reportText.length * 0.2); // 估算时长，确保在音频元数据加载前文字可见
    if (effectiveDuration === 0 || sentences.length === 0) return [];
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
    let accumulatedTime = 0;
    
    return sentences.map(s => {
      const startTime = accumulatedTime;
      const sentenceDuration = (s.length / totalChars) * effectiveDuration;
      accumulatedTime += sentenceDuration;
      return { text: s, start: startTime, end: accumulatedTime };
    });
  }, [sentences, duration, reportText]);

  const activeIndex = timedSentences.findIndex(s => currentTime >= s.start && currentTime < s.end);

  useEffect(() => {
    if (activeIndex !== -1 && sentenceRefs.current[activeIndex]) {
      sentenceRefs.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex]);

  const setupAudio = (base64Audio: string, shouldAutoplay: boolean = true) => {
    if (!isMounted.current || !audioRef.current) return;
    
    try {
      console.log("Setting up audio...");
      // 全局取消之前的语音合成，防止叠加
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      const bytes = decode(base64Audio);
      
      // Check if it's already a WAV file (starts with RIFF)
      const isWav = bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70;
      let audioUrl: string;
      
      if (isWav) {
        const blob = new Blob([bytes], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(blob);
      } else {
        const wavBlob = pcmToWav(bytes, 24000);
        audioUrl = URL.createObjectURL(wavBlob);
      }
      
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = audioUrl;
      
      const audio = audioRef.current;
      audio.src = audioUrl;
      
      audio.load();
      
      if (shouldAutoplay || pendingPlay) {
        console.log("Attempting to play audio...");
        audio.play().then(() => {
          console.log("Audio playback started successfully.");
          if (isMounted.current) {
            setPendingPlay(false);
          }
        }).catch(e => {
          console.warn("Autoplay prevented or failed:", e);
          if (isMounted.current) {
            setIsPlaying(false);
            setAudioLoading(false);
          }
        });
      } else {
        if (isMounted.current) {
          setAudioLoading(false);
        }
      }
    } catch (e) {
      console.error("Failed to setup audio:", e);
      if (isMounted.current) setAudioLoading(false);
    }
  };

  const generateReport = async () => {
    const todayStr = new Date().toLocaleDateString('zh-CN');
    const cachedDate = localStorage.getItem('rehab_report_date');
    const cachedText = localStorage.getItem('rehab_report_text');
    const cachedAudio = localStorage.getItem('rehab_report_audio');
    const cachedVoice = localStorage.getItem('rehab_report_voice');
    // 规范化音色：将 'default' 显式映射为 'Kore'，确保与后端默认逻辑一致，并能正确触发缓存失效
    const currentVoice = (!profile?.voicePreference || profile.voicePreference === 'default') ? 'Kore' : profile.voicePreference;

    // 缓存命中并有效 (增加音频存在性检查，防止之前因 API Key 缺失产生的“无声报表”被继续使用)
    if (cachedDate === todayStr && cachedText && cachedAudio && cachedAudio.length > 500 && cachedVoice === currentVoice) {
      if (!isMounted.current) return;
      setReportText(cachedText);
      setLoading(false);
      setupAudio(cachedAudio);
      return;
    }

    try {
      console.log("Starting report generation via backend API...");
      const res = await fetch(`${API_URL}/api/generate-health-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, userId: auth.currentUser?.uid || "dev_user" })
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const result = await res.json();
      
      if (!isMounted.current) return;
      
      const narrative = result.report;
      const base64Audio = result.audio;

      if (!narrative) throw new Error("Invalid report data received from API");

      setReportText(narrative);
      setLoading(false);

      if (base64Audio) {
        setAudioLoading(true); // show loader on button
        try {
          localStorage.setItem('rehab_report_date', todayStr);
          localStorage.setItem('rehab_report_text', narrative);
          localStorage.setItem('rehab_report_audio', base64Audio);
          localStorage.setItem('rehab_report_voice', currentVoice);
        } catch (e) {
          console.warn("Failed to cache report:", e);
        }
        setupAudio(base64Audio);
      } else {
        console.warn("API response did not contain audio data.");
        setError("未能获得高品质语音，降级为文字模式");
      }
    } catch (error: any) {
      console.error("Report Generation Error:", error);
      if (isMounted.current) {
        setReportText("抱歉，简报生成遇到一点问题，请稍后再试。");
        setError(error.message);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    
    const audio = new Audio();
    audioRef.current = audio;
    
    const handleLoadedMetadata = () => { if (isMounted.current) { setDuration(audio.duration); setAudioLoading(false); } };
    const handleTimeUpdate = () => { if (isMounted.current) { setCurrentTime(audio.currentTime); if (!audio.paused && !isPlaying) setIsPlaying(true); } };
    const handlePlay = () => { if (isMounted.current) setIsPlaying(true); };
    const handlePause = () => { if (isMounted.current) setIsPlaying(false); };
    const handleEnded = () => { if (isMounted.current) { setIsPlaying(false); setCurrentTime(0); } };
    const handleWaiting = () => { if (isMounted.current) setAudioLoading(true); };
    const handleCanPlay = () => { if (isMounted.current) setAudioLoading(false); };
    const handleError = (e: any) => { console.error("Audio object error:", e); if (isMounted.current) { setAudioLoading(false); setIsPlaying(false); } };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    audio.src = SILENT_WAV;
    audio.play().then(() => console.log("Audio context unlocked.")).catch(e => console.log("Unlock normal fail:", e));

    generateReport();

    return () => {
      isMounted.current = false;
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (audioRef.current) {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('playing', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audioRef.current.pause();
        audioRef.current.src = ""; 
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (audioLoading && !audioRef.current.src.startsWith('blob:')) {
      setPendingPlay(!pendingPlay);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        if (isMounted.current) setIsPlaying(true);
      }).catch(e => {
        console.error("Manual play failed:", e);
        if (isMounted.current) setIsPlaying(false);
      });
    }
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto no-scrollbar">
      <div className="min-h-full flex flex-col items-center justify-center p-6 py-8 relative">
        <button onClick={onClose} className="fixed top-6 right-6 z-[110] p-3 bg-white/5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5 backdrop-blur-md">
          <X size={24} />
        </button>

        <div className="w-full max-w-sm flex flex-col items-center space-y-4 md:space-y-6">
          <div className="relative">
            <div className={`w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center transition-all duration-1000 ${isPlaying ? 'scale-110' : 'scale-90 opacity-40'}`}>
              <Volume2 size={40} className={`text-emerald-400 transition-all ${isPlaying ? 'animate-pulse' : ''}`} />
              {isPlaying && [0.2, 0.5, 0.8].map((delay, idx) => (
                <div key={idx} className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ping" style={{ animationDelay: `${delay}s` }}></div>
              ))}
            </div>
          </div>

          <div className="w-full bg-white/5 backdrop-blur-3xl rounded-[40px] p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">康复简报音频</span>
              </div>
              <Sparkles size={16} className="text-white/20" />
            </div>

            {loading ? (
              <div className="space-y-4 py-6">
                <div className="h-2 bg-white/5 rounded-full w-4/5 animate-pulse"></div>
                <div className="h-2 bg-white/5 rounded-full w-full animate-pulse"></div>
                <div className="h-2 bg-white/5 rounded-full w-3/4 animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  ref={scrollContainerRef}
                  className="h-[160px] overflow-y-auto pr-2 custom-scrollbar space-y-3 relative"
                >
                  {timedSentences.map((s, i) => (
                    <div key={i} ref={el => { sentenceRefs.current[i] = el; }}>
                      <ReportMarkdown text={s.text} active={i === activeIndex} />
                    </div>
                  ))}
                  <div className="h-12"></div>
                </div>

                {error && (
                   <p className="text-xs text-rose-400 text-center">{error}</p>
                )}

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex items-center space-x-6 justify-center">
                    <button onClick={() => seek(-15)} className="text-white/30 hover:text-emerald-400 transition-colors"><RotateCcw size={24} /></button>
                    <button 
                      onClick={togglePlay} 
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 ${
                        audioLoading && !audioRef.current?.src.startsWith('blob:')
                        ? (pendingPlay ? 'bg-emerald-600 animate-pulse' : 'bg-slate-800 opacity-80') 
                        : 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:bg-emerald-400'
                      }`}
                    >
                      {audioLoading && !audioRef.current?.src.startsWith('blob:') ? (
                        <div className="flex flex-col items-center text-emerald-400">
                          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-1"></div>
                          <span className="text-[7px] font-black uppercase">{pendingPlay ? '就绪后播放' : '缓冲中'}</span>
                        </div>
                      ) : isPlaying ? (
                        <Pause size={32} fill="currentColor" />
                      ) : (
                        <Play size={32} fill="currentColor" className="ml-1" />
                      )}
                    </button>
                    <button onClick={() => seek(15)} className="text-white/30 hover:text-emerald-400 transition-colors"><RotateCw size={24} /></button>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => { onClose(); onStartVoice?.(); }}
                      className="w-full bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl font-black text-[11px] flex items-center justify-center space-x-2 transition-all active:scale-95 border border-white/5"
                    >
                      <Sparkles size={14} className="text-emerald-400" />
                      <span>针对简报与 AI 专家深入交流</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyHealthReport;

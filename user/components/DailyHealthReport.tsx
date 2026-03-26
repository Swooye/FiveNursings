import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Square, Loader2, Sparkles } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../src/firebase';
import { PatientProfile } from '../types';
import ReactMarkdown from 'react-markdown';

interface DailyHealthReportProps {
  profile: PatientProfile;
  onClose: () => void;
  onUpdateCache: (cache: { date: string, profileJSON: string, text: string }) => void;
  cache?: { date: string, profileJSON: string, text: string } | null;
}

const DailyHealthReport: React.FC<DailyHealthReportProps> = ({ profile, onClose, onUpdateCache, cache }) => {
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSynthesisError, setSpeechSynthesisError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stripMarkdown = (text: string) => {
    return text
      .replace(/[#*`_~]/g, '') // Remove #, *, `, _, ~
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text, remove URL
      .replace(/>+/g, '') // Remove blockquote
      .replace(/\n+/g, ' ') // Replace newline with space
      .trim();
  };

  useEffect(() => {
    const fetchReport = async () => {
      const today = new Date().toLocaleDateString();
      const currentProfileJSON = JSON.stringify(profile);

      if (cache && cache.date === today && cache.profileJSON === currentProfileJSON) {
        setReportText(cache.text);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        let text = "";
        
        // In development, prefer local Express backend
        if (import.meta.env.DEV) {
          try {
            console.log("[DEV] Fetching health report from local proxy...");
            const res = await fetch("/api/generate-health-report", { // Matches server/index.js
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile, userId: auth.currentUser?.uid || "dev_user" })
            });
            
            if (res.ok) {
              const result = await res.json();
              text = result.report;
            }
          } catch (localErr) {
            console.warn("Local AI generation failed, falling back to Firebase:", localErr);
          }
        }

        if (!text) {
          const generateHealthReport = httpsCallable(functions, 'generateHealthReport');
          const result = await generateHealthReport({ profile });
          const data = result.data as { report: string };
          if (data && data.report) {
            text = data.report;
          } else {
            throw new Error("Invalid report data received from AI");
          }
        }
        
        setReportText(text);
        onUpdateCache({ date: today, profileJSON: currentProfileJSON, text: text });

      } catch (err: any) {
        console.error("Report Generation Error:", err);
        setError(err.message || "生成康复简报失败，请稍后再试。");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [profile, cache, onUpdateCache]);

  // Voice synthesis effect
  useEffect(() => {
    if (reportText && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const cleanText = stripMarkdown(reportText);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'zh-CN';
      
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        let targetVoiceName = profile.voicePreference;
        
        if (!targetVoiceName || targetVoiceName === 'default') {
            const meijia = voices.find(v => v.name.toLowerCase().includes('meijia'));
            if (meijia) targetVoiceName = meijia.name;
        }

        if (targetVoiceName && targetVoiceName !== 'default') {
           const preferredVoice = voices.find(v => v.name === targetVoiceName);
           if (preferredVoice) utterance.voice = preferredVoice;
        }
        
        // Final fallback to Google official if still no voice and not mobile
        if (!utterance.voice) {
             const googleVoice = voices.find(v => 
                v.name.includes('Google') && 
                (v.name.includes('普通话') || v.name.includes('Mandarin'))
             );
             if (googleVoice) utterance.voice = googleVoice;
        }
      };

      setVoice();
      if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = setVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e);
          setIsPlaying(false);
          if (e.error === 'not-allowed') {
              setSpeechSynthesisError("请点击播放按钮");
          } else if (e.error !== 'interrupted') {
              setSpeechSynthesisError("语音播放中断");
          }
      };

      utteranceRef.current = utterance;

      // Auto-play attempt (often blocked)
      try {
          window.speechSynthesis.speak(utterance);
      } catch (e) {
          console.error("Auto-play failed", e);
      }

      return () => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else if (reportText && !('speechSynthesis' in window)) {
      setSpeechSynthesisError("您的浏览器不支持语音播报");
    }
  }, [reportText, profile.voicePreference]);

  const togglePlay = () => {
    if (!('speechSynthesis' in window)) return;
    
    if (isPlaying) {
      window.speechSynthesis.cancel(); // Use cancel instead of pause as it's more reliable
      setIsPlaying(false);
    } else {
      if (utteranceRef.current) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utteranceRef.current);
          setIsPlaying(true);
          setSpeechSynthesisError(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
               <Sparkles size={14} className="text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Personal Broadcast</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">今日康复简报</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors relative z-10">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
           {loading ? (
             <div className="py-12 flex flex-col items-center justify-center space-y-4">
               <div className="relative">
                 <div className="absolute inset-0 border-4 border-emerald-100 dark:border-emerald-900/30 rounded-full"></div>
                 <Loader2 size={32} className="text-emerald-500 animate-spin relative z-10" />
               </div>
               <p className="text-sm font-bold text-slate-400 animate-pulse">五养教练正在为您分析数据...</p>
             </div>
           ) : error ? (
             <div className="py-10 text-center">
               <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                 <X size={20} className="text-rose-500" />
               </div>
               <p className="text-rose-500 font-bold text-sm px-4">{error}</p>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="prose prose-slate dark:prose-invert prose-sm max-w-none font-medium leading-relaxed prose-p:mb-3 prose-strong:text-emerald-600 dark:prose-strong:text-emerald-400 prose-strong:font-black">
                  <ReactMarkdown>{reportText || ""}</ReactMarkdown>
                </div>
                
                {/* Audio Player Controls */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center space-x-3">
                     <button 
                       onClick={togglePlay} 
                       className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-all ${
                         reportText ? 'bg-emerald-600 text-white hover:scale-105 active:scale-95' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                       }`}
                     >
                       {isPlaying ? <Square size={18} className="fill-current" /> : <Play size={20} className="ml-1 fill-current" />}
                     </button>
                     <div>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-200">林教练原声播报</p>
                       <p className="text-xs font-medium text-slate-400">
                         {speechSynthesisError ? speechSynthesisError : (isPlaying ? '正在播报...' : '准备就绪')}
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex items-end space-x-1 h-6">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'h-1'}`} style={{ height: isPlaying ? `${Math.random() * 100 + 20}%` : '4px', animationDelay: `${i * 0.1}s` }}></div>
                      ))}
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DailyHealthReport;

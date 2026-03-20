
import React, { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import ReactMarkdown from 'react-markdown';
import { X, Sparkles, Loader2, AlertTriangle, Volume2 } from 'lucide-react';
import { PatientProfile } from '../types';
import { functions } from '../src/firebase';

interface DailyHealthReportProps {
  profile: PatientProfile;
  onClose: () => void;
  cache: { date: string; profileJSON: string; text: string } | null;
  onUpdateCache: (cache: { date: string; profileJSON: string; text: string }) => void;
}

const DailyHealthReport: React.FC<DailyHealthReportProps> = ({ profile, onClose, cache, onUpdateCache }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = useCallback((text: string, voiceName?: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            if (voiceName && voiceName !== 'default') {
                const selectedVoice = voices.find(v => v.name === voiceName);
                if (selectedVoice) utterance.voice = selectedVoice;
            }
            utterance.onstart = () => setIsPlaying(true);
            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = (e) => {
              console.error("SpeechSynthesis Error:", e);
              setIsPlaying(false);
            };
            window.speechSynthesis.speak(utterance);
        } else {
          window.speechSynthesis.onvoiceschanged = () => {
            trySpeak();
            window.speechSynthesis.onvoiceschanged = null;
          };
        }
    };
    trySpeak();
  }, []);

  useEffect(() => {
    const generateReport = async () => {
      const today = new Date().toISOString().split('T')[0];
      const currentProfileJSON = JSON.stringify(profile);

      if (cache && cache.date === today && cache.profileJSON === currentProfileJSON) {
        setReportText(cache.text);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const generateHealthReport = httpsCallable(functions, 'generateHealthReport');
        const result = await generateHealthReport({ profile });
        const data = result.data as { report: string };
        
        if (data && data.report) {
          setReportText(data.report);
          onUpdateCache({ date: today, profileJSON: currentProfileJSON, text: data.report });
        } else {
          throw new Error("Invalid report data received from AI");
        }
      } catch (err: any) {
        console.error("Report Generation Error:", err);
        const errorMessage = err.message || 'AI 服务暂时不可用，请稍后再试。';
        setError(`生成康复简报失败，${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    generateReport();
  }, [profile, cache, onUpdateCache]);

  useEffect(() => {
    if (reportText && !loading && !error) {
      const timer = setTimeout(() => {
        speak(reportText, profile.voicePreference);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reportText, loading, error, profile.voicePreference, speak]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-500 overflow-hidden">
      {/* Container - Fixed constraints to prevent overflow */}
      <div className="w-full max-w-sm h-full max-h-[85vh] bg-slate-900 rounded-[40px] flex flex-col relative shadow-2xl overflow-hidden border border-white/10">
        
        {/* Header Section */}
        <header className="px-6 pt-10 pb-4 flex items-center justify-between sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Sparkles className={`text-emerald-400 ${loading ? 'animate-pulse' : ''}`} size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">AI 康复简报</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Daily Intelligence
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all border border-white/10"
          >
            <X size={18} />
          </button>
        </header>

        {/* Status indicator */}
        {isPlaying && (
          <div className="px-6 py-2 bg-emerald-500/10 border-y border-emerald-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-0.5 items-end h-3">
                <div className="w-1 bg-emerald-400 rounded-full animate-pulse h-full"></div>
                <div className="w-1 bg-emerald-400 rounded-full animate-pulse h-2 [animation-delay:0.2s]"></div>
                <div className="w-1 bg-emerald-400 rounded-full animate-pulse h-3 [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">正在播放分析语音...</span>
            </div>
          </div>
        )}

        {/* Content Section - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/10 rounded-full"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Loader2 size={24} className="text-emerald-500 animate-pulse" />
                </div>
              </div>
              <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-[180px]">
                正在结合您的档案数据<br/>生成个性化建议...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
                  <AlertTriangle size={32} />
                </div>
                <p className="text-slate-500 text-[11px] font-medium px-4 leading-relaxed">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest"
                >
                  重试生成
                </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white/5 rounded-[28px] p-6 border border-white/5 shadow-inner">
                <div className="prose prose-invert text-slate-300 prose-strong:text-emerald-400 prose-p:leading-relaxed prose-p:text-[13px] prose-p:font-medium w-full max-w-none">
                  <ReactMarkdown>
                    {reportText}
                  </ReactMarkdown>
                </div>
                
                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">
                    Five-Nursings Protection
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-6 bg-slate-900 border-t border-white/5 shrink-0">
           {!loading && !error && (
             <button 
               onClick={() => speak(reportText, profile.voicePreference)}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-[20px] font-black text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
             >
               <Volume2 size={16} />
               <span className="uppercase tracking-widest">{isPlaying ? '正在播放' : '再次播放简报'}</span>
             </button>
           )}
           <p className="text-center text-[9px] text-slate-600 font-bold mt-4 tracking-widest uppercase">
             {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} · HEALTH UPDATE
           </p>
        </footer>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); }
      `}} />
    </div>
  );
};

export default DailyHealthReport;

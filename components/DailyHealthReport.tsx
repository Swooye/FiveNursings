
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';

    const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            if (voiceName && voiceName !== 'default') {
                const selectedVoice = voices.find(v => v.name === voiceName);
                if (selectedVoice) utterance.voice = selectedVoice;
            }
            utterance.onstart = () => setIsPlaying(true);
            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);
            window.speechSynthesis.speak(utterance);
        } else {
          window.speechSynthesis.onvoiceschanged = trySpeak;
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
        setReportText(data.report);
        onUpdateCache({ date: today, profileJSON: currentProfileJSON, text: data.report });
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
      window.speechSynthesis.cancel();
      speak(reportText, profile.voicePreference);
    }
    return () => {
      setIsPlaying(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [reportText, loading, error, profile.voicePreference, speak]);

  const handleClose = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
      <button onClick={handleClose} className="absolute top-6 right-6 p-3 bg-white/5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/10">
        <X size={24} />
      </button>

      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-3xl rounded-[32px] p-8 border border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`relative w-6 h-6 flex items-center justify-center`}>
              <div className={`absolute w-full h-full rounded-full bg-emerald-400/30 animate-ping ${isPlaying ? '' : 'hidden'}`}></div>
              <Volume2 size={20} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">AI 康复简报</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">{new Date().toLocaleDateString('zh-CN')}</span>
        </div>

        <div className="h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 size={40} className="text-emerald-500 animate-spin" />
              <h3 className="text-white font-bold text-lg mt-6">AI 正在为您生成专属简报...</h3>
              <p className="text-slate-400 text-sm mt-2">请稍候，正在结合您的数据进行分析</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangle size={40} className="text-amber-500" />
                <h3 className="text-white font-bold text-lg mt-6">无法生成简报</h3>
                <p className="text-slate-400 text-sm mt-2 px-4">{error}</p>
            </div>
          ) : (
            <div className="prose prose-invert text-slate-200 prose-strong:text-emerald-400 w-full max-w-none">
              <ReactMarkdown>
                {reportText}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
       <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.4); }
      `}} />
    </div>
  );
};

export default DailyHealthReport;


import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  Download, 
  User, 
  Activity, 
  FileText, 
  Heart, 
  X, 
  Sparkles, 
  Loader2, 
  ShieldCheck, 
  Info, 
  Plus, 
  ChevronRight, 
  Settings,
  UserPlus,
  Eye,
  Utensils,
  BrainCircuit,
  AlertCircle,
  Stethoscope,
  ClipboardList,
  History,
  CheckCircle2,
  TrendingUp,
  Lock,
  RefreshCw,
  Copy
} from 'lucide-react';
import { PatientProfile, TCMAnalysisResult } from '../types';
import { NURSING_ICONS } from '../constants';
import { analyzeHealthProfile } from '../services/geminiService';

interface HealthRecordProps {
  profile: PatientProfile;
  onBack: () => void;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
}

const HealthRecord: React.FC<HealthRecordProps> = ({ profile, onBack, onUpdateProfile }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportStep, setExportStep] = useState<number>(0); 
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  // --- 关键修复：根据 birthDate 计算年龄 ---
  const calculatedAge = useMemo(() => {
    if (!profile.birthDate) return profile.age || 0;
    const birth = new Date(profile.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }, [profile.birthDate, profile.age]);

  const q = profile.questionnaire;

  useEffect(() => {
    const isReady = profile.isQuestionnaireComplete;
    // 深度查验：确保辨证结论不仅仅是一个空对象，而是包含实际报告内容
    const hasValidResult = !!(profile.tcmAnalysisResult && profile.tcmAnalysisResult.constitutionType);
    const needsReport = !hasValidResult;
    
    if (isReady && needsReport && !isAnalyzing) {
      handleStartAnalysis();
    }
  }, [profile.isQuestionnaireComplete, profile.tcmAnalysisResult?.constitutionType]);

  const triggerToast = (message: string, type: 'success' | 'info' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleStartAnalysis = async () => {
    if (!profile.isQuestionnaireComplete) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeHealthProfile(profile);
      onUpdateProfile({ tcmAnalysisResult: result });
      triggerToast("AI 辨证档案已更新");
    } catch (err) {
      console.error(err);
      setError("AI 辨证引擎暂时忙碌，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = () => {
    setExportStep(1);
    setTimeout(() => setExportStep(2), 1000);
    setTimeout(() => setExportStep(3), 2000);
    setTimeout(() => {
      setExportStep(0);
      triggerToast("健康档案 PDF 已生成并导出");
    }, 3000);
  };

  const handleShare = async () => {
    const displayName = isPrivateMode ? profile.name.charAt(0) + '**' : profile.name;
    const shareText = `【康养家·康复档案】\n患者: ${displayName}\n主导体质: ${profile.tcmAnalysisResult?.constitutionType || '分析中'}\n确诊病种: ${profile.cancerType}\n康复建议: ${profile.tcmAnalysisResult?.rehabAdvice[0] || '定期监测'}\n查看详情: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}的康复档案`,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerToast("分享文案已复制，请粘贴发送给亲友", "info");
    } catch (err) {
      triggerToast("无法自动复制，请手动截屏分享", "info");
    }
  };

  const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; badge?: string; className?: string }> = ({ title, icon, children, badge, className = "" }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-2 text-left">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
            {icon}
          </div>
          <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
        </div>
        {badge && <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{badge}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );


  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-500 pb-32 shadow-2xl border-x border-slate-200 dark:border-slate-800 no-scrollbar relative">
      {showToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 whitespace-nowrap">
            {showToast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} className="text-blue-400" />}
            <span className="text-sm font-bold">{showToast.message}</span>
          </div>
        </div>
      )}

      {/* Record Settings (Drawer relative to App Frame) */}
      {showSettings && (
        <div className="fixed inset-0 z-[250] flex justify-center animate-in fade-in duration-300">
          {/* Global Backdrop Mask */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
          
          {/* Centered App Container for Drawer (Constraints drawer to App width) */}
          <div className="relative w-full max-w-md h-full pointer-events-none">
            <div className="absolute inset-y-0 left-0 w-[85%] max-w-[300px] bg-white dark:bg-slate-900 shadow-2xl p-8 flex flex-col pointer-events-auto animate-in slide-in-from-left duration-500 rounded-r-[40px]">
                <div className="flex justify-between items-center mb-10 text-left">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">档案配置</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-transform">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-8 flex-1 text-left">
                  <div className="flex items-center justify-between p-1">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">隐私脱敏模式</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">分享时隐藏患者敏感真实信息</p>
                    </div>
                    <button 
                      onClick={() => setIsPrivateMode(!isPrivateMode)} 
                      className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${isPrivateMode ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isPrivateMode ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  
                  <div className="pt-2">
                    <button 
                      onClick={() => { setShowSettings(false); handleStartAnalysis(); }}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/5 active:scale-95 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                          <RefreshCw size={16} className="text-emerald-500" />
                        </div>
                        <span className="text-sm font-bold">重新运行 AI 辨证</span>
                      </div>
                      <ChevronRight size={14} className="opacity-30" />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-10 text-center">
                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Powered by Gemini Pro</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {selectedImage && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setSelectedImage(null)} className="absolute top-10 right-8 p-3 text-white/50 hover:text-white"><X size={32} /></button>
          <img src={selectedImage} alt="Full view" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-12 pb-4 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">健康档案</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl active:scale-90 transition-transform"
        >
          <Settings size={20} />
        </button>
      </header>

      <main className="p-5 space-y-6">
        {/* Profile Summary Card */}
        <div className="bg-slate-800 dark:bg-slate-900 rounded-[40px] p-8 relative overflow-hidden border border-slate-700 dark:border-slate-800 shadow-2xl text-left">
          <div className="relative z-10 flex items-center space-x-6">
            <div className="w-16 h-16 rounded-3xl bg-white/10 dark:bg-slate-800 border border-white/10 dark:border-slate-700 p-1 backdrop-blur-md">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} className="w-full h-full rounded-2xl bg-white" alt="Avatar" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black tracking-tight text-white">{isPrivateMode ? profile.name.charAt(0) + '**' : profile.name}</h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400">{profile.gender} · {calculatedAge}岁 · {profile.cancerType}</span>
              </div>
              <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/30">
                <ShieldCheck size={10} />
                <span>{profile.stage}</span>
              </div>
            </div>
            <ShieldCheck size={40} className="text-emerald-500/20" />
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-1 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
           <div className="p-7 space-y-6 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2.5 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 text-white shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] block truncate">Diagnostic Analysis</span>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">AI 辨证分析结论</h3>
                  </div>
                </div>
              </div>
              {isAnalyzing ? (
                 <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">专家辨证结论合成中...</p>
                 </div>
              ) : profile.tcmAnalysisResult ? (
                 <div className="animate-in slide-in-from-bottom-4 duration-700 space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">判定为主导体质</span>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mb-2">{profile.tcmAnalysisResult.constitutionType}</div>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic px-4">“{profile.tcmAnalysisResult.constitutionAnalysis}”</p>
                    </div>
                 </div>
              ) : (
                <div className="py-10 text-center opacity-30 italic font-bold">辨证分析收集中...</div>
              )}
           </div>
        </div>

        {/* Five Nursings Visualization Section */}
        <Section title="五养康复纬度分析" icon={<Activity size={20} />} badge="康复指数">
            <div className="space-y-5 py-2">
                {[
                    { label: '饮食养', score: profile.scores?.diet || 0, color: 'bg-amber-400' },
                    { label: '运动养', score: profile.scores?.exercise || 0, color: 'bg-emerald-400' },
                    { label: '膏方养', score: profile.scores?.sleep || 0, color: 'bg-purple-400' },
                    { label: '心理养', score: profile.scores?.mental || 0, color: 'bg-rose-400' },
                    { label: '功能养', score: profile.scores?.function || 0, color: 'bg-blue-400' },
                ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            <span>{item.label}</span>
                            <span className="text-slate-700 dark:text-slate-200">{item.score}分</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${item.color} rounded-full transition-all duration-1000 delay-300`} 
                                style={{ width: `${item.score}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Section>

        {/* Cases */}
        <Section title="结构化康复档案" icon={<ClipboardList size={20} />} badge="临床背书">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-left">
               <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">病种分类</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{profile.cancerType}</span>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">当前周期</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{profile.stage}</span>
               </div>
            </div>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm flex space-x-4 z-50">
        <button onClick={handleExportPDF} className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-4 rounded-[24px] font-black text-xs shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all">
          <Download size={16} /><span>导出 PDF 档案</span>
        </button>
        <button onClick={handleShare} className="flex-1 bg-emerald-600 text-white py-4 rounded-[24px] font-black text-xs shadow-2xl shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-95 transition-all">
          <Share2 size={16} /><span>分享康复进度</span>
        </button>
      </div>
    </div>
  );
};

export default HealthRecord;

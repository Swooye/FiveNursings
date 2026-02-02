
import React, { useState, useEffect } from 'react';
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
import { analyzeTCMImages } from '../services/geminiService';

interface HealthRecordProps {
  profile: PatientProfile;
  onBack: () => void;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
}

const HealthRecord: React.FC<HealthRecordProps> = ({ profile, onBack, onUpdateProfile }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportStep, setExportStep] = useState<number>(0); // 0: idle, 1: data, 2: rendering, 3: finishing
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  const q = profile.questionnaire;

  // Auto-analysis logic
  useEffect(() => {
    const hasPhotos = !!(q?.tonguePhoto || q?.facePhoto);
    const needsReport = !profile.tcmAnalysisResult;
    if (hasPhotos && needsReport && !isAnalyzing) {
      handleStartAnalysis();
    }
  }, [q?.tonguePhoto, q?.facePhoto, profile.tcmAnalysisResult]);

  const triggerToast = (message: string, type: 'success' | 'info' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleStartAnalysis = async () => {
    if (!q?.tonguePhoto && !q?.facePhoto) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeTCMImages(q.tonguePhoto, q.facePhoto);
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
        // Fallback to clipboard if user cancels or error
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

  const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; badge?: string }> = ({ title, icon, children, badge }) => (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3 text-left">
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
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10 whitespace-nowrap">
            {showToast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} className="text-blue-400" />}
            <span className="text-sm font-bold">{showToast.message}</span>
          </div>
        </div>
      )}

      {/* Record Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-[250] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowSettings(false)}></div>
          <div className="relative w-80 bg-white dark:bg-slate-900 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">档案配置</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 text-slate-300"><X size={24} /></button>
            </div>
            <div className="space-y-8 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">隐私脱敏模式</p>
                  <p className="text-[10px] text-slate-400">分享时隐藏患者敏感真实信息</p>
                </div>
                <button onClick={() => setIsPrivateMode(!isPrivateMode)} className={`w-12 h-6 rounded-full transition-all relative ${isPrivateMode ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPrivateMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <button 
                onClick={() => { setShowSettings(false); handleStartAnalysis(); }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-700 dark:text-slate-200"
              >
                <div className="flex items-center space-x-3">
                  <RefreshCw size={18} className="text-emerald-500" />
                  <span className="font-bold">重新运行 AI 辨证</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-800">
               <p className="text-[10px] text-amber-800 dark:text-amber-200 font-bold leading-relaxed">提示：此档案受《医疗健康隐私协议》保护，所有数据加密存储。</p>
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
        <div className="bg-slate-800 dark:bg-slate-900 rounded-[40px] p-8 relative overflow-hidden border border-slate-700 dark:border-slate-800 shadow-2xl">
          <div className="relative z-10 flex items-center space-x-6">
            <div className="w-16 h-16 rounded-3xl bg-white/10 dark:bg-slate-800 border border-white/10 dark:border-slate-700 p-1 backdrop-blur-md">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} className="w-full h-full rounded-2xl bg-white" alt="Avatar" />
            </div>
            <div className="text-left flex-1">
              <h2 className="text-xl font-black tracking-tight text-white">{isPrivateMode ? profile.name.charAt(0) + '**' : profile.name}</h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400">{profile.gender} · {profile.age}岁 · {profile.cancerType}</span>
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

        {/* AI Analysis Conclusions */}
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
                {isAnalyzing && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1 rounded-full flex items-center space-x-2 border border-emerald-100 shrink-0">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">正在分析</span>
                  </div>
                )}
              </div>

              {isAnalyzing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-5 animate-in fade-in duration-500">
                   <div className="relative">
                      <div className="w-20 h-20 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit size={28} className="text-emerald-500/40" />
                      </div>
                   </div>
                   <div className="text-center space-y-1 px-4">
                     <p className="text-[13px] font-black text-slate-700 dark:text-slate-200">正在重构体质模型</p>
                     <p className="text-[11px] font-medium text-slate-400 leading-relaxed">正在深度解析舌面影像病理特征...</p>
                   </div>
                </div>
              ) : profile.tcmAnalysisResult ? (
                <div className="animate-in slide-in-from-bottom-4 duration-700 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                     <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">判定为主导体质</span>
                     <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mb-2">{profile.tcmAnalysisResult.constitutionType}</div>
                     <div className="h-1 w-12 bg-emerald-500/20 rounded-full mb-4"></div>
                     <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic px-4">“{profile.tcmAnalysisResult.constitutionAnalysis}”</p>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-start space-x-3">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg shrink-0 mt-0.5"><Eye size={14} /></div>
                        <div className="flex-1">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">影像辨析</h4>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{profile.tcmAnalysisResult.syndromeDifferentiation}</p>
                        </div>
                     </div>

                     <div className="flex items-start space-x-3">
                        <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg shrink-0 mt-0.5"><Utensils size={14} /></div>
                        <div className="flex-1">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">调养忌口建议</h4>
                           <div className="flex flex-wrap gap-2 mt-1">
                              {profile.tcmAnalysisResult.dietaryTaboos.map(t => (
                                <span key={t} className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-black border border-rose-100 dark:border-rose-900/30">{t}</span>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              ) : error ? (
                <div className="py-10 text-center space-y-4">
                   <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto"><AlertCircle size={24} /></div>
                   <p className="text-sm font-bold text-rose-500 px-4">{error}</p>
                   <button onClick={handleStartAnalysis} className="bg-slate-800 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg">手动重新分析</button>
                </div>
              ) : (
                <div className="py-10 text-center opacity-30 italic"><p className="text-sm font-bold">暂无分析数据，请检查影像采集</p></div>
              )}
           </div>
        </div>

        {/* Structured Clinical Case Section */}
        <Section title="结构化康复档案" icon={<ClipboardList size={20} />} badge="临床背书">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
               <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-left border border-slate-100/50 dark:border-slate-800">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">病种分类</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{profile.cancerType}</span>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-left border border-slate-100/50 dark:border-slate-800">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">当前周期</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{profile.stage}</span>
               </div>
            </div>

            <div className="p-5 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl text-left border border-emerald-100/50 dark:border-emerald-800">
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">主诉及核心诉求</span>
              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                “{q?.chiefComplaint || '暂无描述'}”
              </p>
            </div>

            <div className="space-y-3">
               <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><Stethoscope size={14} className="text-slate-400" /></div>
                  <div className="flex-1">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">关键诊疗史</span>
                     <div className="flex flex-wrap gap-2 mt-1">
                        {q?.pastTreatments.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700">{t}</span>
                        ))}
                     </div>
                  </div>
               </div>
               
               <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg"><History size={14} className="text-slate-400" /></div>
                  <div className="flex-1 text-left">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">既往慢病</span>
                     <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                       {q?.chronicDiseases.join('、') || '无记录'}
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </Section>

        {/* Progress & Visual Evidence */}
        <Section title="康复指标动态" icon={<TrendingUp size={20} />} badge="最近30天">
           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between">
              <div className="flex flex-col text-left">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">综合评估趋势</span>
                 <span className="text-sm font-bold text-emerald-600">稳步回升 · +12.4%</span>
              </div>
              <div className="h-8 w-24 flex items-end space-x-1 pb-1">
                 {[40, 52, 48, 65, 58, 72, 82].map((v, i) => (
                   <div key={i} className={`flex-1 rounded-full ${i === 6 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: `${v}%` }}></div>
                 ))}
              </div>
           </div>
           <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic text-left px-2">
             系统分析显示您的体质正在由“阴虚”向“平和”转化，运动耐力指标有显著正向反馈。
           </p>
        </Section>
      </main>

      {/* Fixed Action Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm flex space-x-4 z-50">
        <button 
          onClick={handleExportPDF}
          disabled={exportStep > 0}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-4 rounded-[24px] font-black text-xs shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {exportStep > 0 ? (
            <div className="flex items-center space-x-2">
               <Loader2 size={16} className="animate-spin text-emerald-500" />
               <span>{exportStep === 1 ? '结构化中' : exportStep === 2 ? '图表渲染中' : '导出中...'}</span>
            </div>
          ) : (
            <><Download size={16} /><span>导出 PDF 档案</span></>
          )}
        </button>
        <button 
          onClick={handleShare}
          className="flex-1 bg-emerald-600 text-white py-4 rounded-[24px] font-black text-xs shadow-2xl shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <Share2 size={16} /><span>分享康复进度</span>
        </button>
      </div>
    </div>
  );
};

export default HealthRecord;

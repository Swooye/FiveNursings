
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Camera, FileText, CheckCircle2, Circle, X, Plus, Trash2, Loader2, Check, Sparkles, Utensils, HeartPulse, UserCircle, Info, BrainCircuit, Cpu, Database, ShieldCheck } from 'lucide-react';
import { PatientProfile, HealthQuestionnaireData, CancerType, TreatmentStage } from '../types';

interface HealthQuestionnaireProps {
  profile: PatientProfile;
  onComplete: (data: Partial<PatientProfile>) => void;
  onSkip: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const ANALYSIS_STAGES = [
  { text: "正在解析临床病历数据...", icon: <FileText className="text-blue-400" /> },
  { text: "比对林主任专家康复模型...", icon: <BrainCircuit className="text-emerald-400" /> },
  { text: "正在识别舌面影像病理特征...", icon: <Camera className="text-amber-400" /> },
  { text: "五养动态指标模型构建中...", icon: <Database className="text-purple-400" /> },
  { text: "正在为您生成专属健康档案...", icon: <ShieldCheck className="text-emerald-500" /> }
];

const HealthQuestionnaire: React.FC<HealthQuestionnaireProps> = ({ profile, onComplete, onSkip }) => {
  const [step, setStep] = useState<Step>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const tongueInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    cancerType: profile.cancerType,
    stage: profile.stage,
    chiefComplaint: profile.questionnaire?.chiefComplaint || '',
    pastTreatments: profile.questionnaire?.pastTreatments || [],
    currentTreatments: profile.questionnaire?.currentTreatments || [],
    chronicDiseases: profile.questionnaire?.chronicDiseases || [],
    lifestyle: profile.questionnaire?.lifestyle || {
      smoking: { status: false, isQuit: false },
      drinking: { status: false, isQuit: false },
      exercise: { status: false },
      dietHabit: '均衡饮食'
    },
    currentDiscomfort: profile.questionnaire?.currentDiscomfort || '',
    reports: profile.questionnaire?.reports || [],
    tonguePhoto: profile.questionnaire?.tonguePhoto,
    facePhoto: profile.questionnaire?.facePhoto
  });

  // Cycle through analysis stages
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setAnalysisStage(prev => {
          if (prev >= ANALYSIS_STAGES.length - 1) return prev;
          return prev + 1;
        });
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const TREATMENT_OPTIONS = ['无治疗', '手术', '化疗', '放疗', '靶向治疗', '免疫治疗', '其他'];
  const CHRONIC_OPTIONS = ['糖尿病', '高血压', '冠心病', '高血脂', '脂肪肝', '其他'];
  const DIET_OPTIONS = ['均衡饮食', '素食为主', '重油重盐', '生冷辛辣', '其他'];

  const toggleSelection = (list: string[], item: string) => {
    if (item === '无治疗') return ['无治疗'];
    const newList = list.filter(i => i !== '无治疗');
    return newList.includes(item) ? newList.filter(i => i !== item) : [...newList, item];
  };

  const handleNext = () => {
    if (step < 6) {
      setStep((step + 1) as Step);
    } else {
      setIsAnalyzing(true);
      // Give the analysis a real-world feel
      setTimeout(() => {
        onComplete({
          cancerType: formData.cancerType,
          stage: formData.stage,
          isQuestionnaireComplete: true,
          questionnaire: {
            chiefComplaint: formData.chiefComplaint,
            pastTreatments: formData.pastTreatments,
            currentTreatments: formData.currentTreatments,
            chronicDiseases: formData.chronicDiseases,
            lifestyle: formData.lifestyle,
            currentDiscomfort: formData.currentDiscomfort,
            reports: formData.reports,
            tonguePhoto: formData.tonguePhoto,
            facePhoto: formData.facePhoto
          }
        });
        setIsAnalyzing(false);
      }, ANALYSIS_STAGES.length * 1200 + 500);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
    else onSkip();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'tongue' | 'face') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [type === 'tongue' ? 'tonguePhoto' : 'facePhoto']: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderMultiSelect = (options: string[], selected: string[], onToggle: (item: string) => void) => (
    <div className="grid grid-cols-2 gap-3">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onToggle(opt)}
          className={`px-4 py-5 rounded-[24px] border-2 text-sm font-black transition-all flex items-center justify-between ${
            selected.includes(opt)
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
          }`}
        >
          <span>{opt}</span>
          {selected.includes(opt) ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="opacity-20" />}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in duration-500">
      {isAnalyzing && (
        <div className="absolute inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="relative mb-12">
             <div className="w-32 h-32 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={40} className="text-emerald-400 animate-pulse" />
             </div>
             <div className="absolute -top-4 -right-4 bg-amber-500 text-white p-2.5 rounded-2xl animate-bounce">
                <BrainCircuit size={20} />
             </div>
          </div>
          <div className="space-y-6 max-w-xs">
            <h2 className="text-2xl font-black text-white tracking-tight">AI 辨证引擎启动中</h2>
            <div className="space-y-4">
               {ANALYSIS_STAGES.map((stage, idx) => (
                 <div key={idx} className={`flex items-center space-x-3 transition-all duration-700 ${idx === analysisStage ? 'opacity-100 translate-x-0' : idx < analysisStage ? 'opacity-30 -translate-y-1' : 'opacity-0 translate-y-4'}`}>
                    <div className="p-2 bg-white/5 rounded-xl">{stage.icon}</div>
                    <span className="text-sm font-bold text-slate-300">{stage.text}</span>
                    {idx < analysisStage && <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />}
                 </div>
               ))}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full max-w-[240px] h-1.5 bg-white/5 rounded-full mt-16 overflow-hidden p-0.5">
             <div 
               className="h-full bg-emerald-500 rounded-full transition-all duration-1200 ease-linear" 
               style={{ width: `${((analysisStage + 1) / ANALYSIS_STAGES.length) * 100}%` }}
             ></div>
          </div>
        </div>
      )}

      {/* Header */}
      {!isAnalyzing && (
        <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <button onClick={handleBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">健康评估</h1>
            <div className="flex space-x-1.5 mt-2">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'bg-emerald-500 w-6 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-800 w-2'}`} />
              ))}
            </div>
          </div>
          <button onClick={onSkip} className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">跳过</button>
        </header>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-10 no-scrollbar">
        {!isAnalyzing && (
          <>
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">1. 确诊状态核实</h2>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.15em]">Foundation of Recovery</p>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">选择确诊病种</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(CancerType).map(type => (
                      <button key={type} onClick={() => setFormData(prev => ({ ...prev, cancerType: type }))} className={`p-5 rounded-[24px] border-2 text-xs font-black transition-all flex justify-between items-center ${formData.cancerType === type ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg scale-[1.03]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                        <span>{type}</span>
                        {formData.cancerType === type && <CheckCircle2 size={16} className="text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">康复随访阶段</label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.values(TreatmentStage).map(stage => (
                      <button key={stage} onClick={() => setFormData(prev => ({ ...prev, stage: stage }))} className={`p-6 rounded-[28px] border-2 text-xs font-black transition-all flex justify-between items-center ${formData.stage === stage ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                        <span>{stage}</span>
                        {formData.stage === stage && <CheckCircle2 size={18} className="text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">2. 核心康复诉求</h2>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Your Primary Concerns</p>
                </div>
                <textarea
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                  placeholder="例如：手术后体力下降，或想缓解目前的焦虑..."
                  className="w-full h-64 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-8 font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-emerald-500 focus:bg-emerald-50/5 transition-all shadow-sm"
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                <div className="space-y-2">
                   <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">3. 诊疗历程</h2>
                   <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Treatment History</p>
                </div>
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">曾接受过及正在进行的治疗</label>
                  {renderMultiSelect(TREATMENT_OPTIONS, formData.pastTreatments, (item) => 
                    setFormData({ ...formData, pastTreatments: toggleSelection(formData.pastTreatments, item) })
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                <div className="space-y-2">
                   <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">4. 基础病与饮食</h2>
                   <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Comorbidity & Diet</p>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">慢性病史 (多选)</label>
                  {renderMultiSelect(CHRONIC_OPTIONS, formData.chronicDiseases, (item) => 
                    setFormData({ ...formData, chronicDiseases: toggleSelection(formData.chronicDiseases, item) })
                  )}
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">饮食习惯 (单选)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {DIET_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setFormData({ ...formData, lifestyle: { ...formData.lifestyle, dietHabit: opt }})} className={`px-4 py-5 rounded-[24px] border-2 text-sm font-black transition-all flex items-center justify-between ${formData.lifestyle.dietHabit === opt ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                        <span>{opt}</span>
                        {formData.lifestyle.dietHabit === opt ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="opacity-20" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">5. 当前身体不适</h2>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Current Discomfort</p>
                </div>
                <textarea
                  value={formData.currentDiscomfort}
                  onChange={(e) => setFormData({ ...formData, currentDiscomfort: e.target.value })}
                  placeholder="详细描述您目前感到最不舒服的地方，如：食欲不振、失眠、局部疼痛等..."
                  className="w-full h-80 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-8 font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-emerald-500 focus:bg-emerald-50/5 transition-all shadow-sm"
                />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 text-left">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">6. 中医影像采集</h2>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">TCM Analysis Evidence</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                   {/* Tongue Photo */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">舌苔照片 (辨识体质核心)</label>
                      <div 
                        onClick={() => tongueInputRef.current?.click()}
                        className="relative h-44 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-emerald-500 transition-all"
                      >
                         {formData.tonguePhoto ? (
                           <img src={formData.tonguePhoto} alt="Tongue" className="w-full h-full object-cover" />
                         ) : (
                           <>
                             <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                                <Utensils size={32} />
                             </div>
                             <span className="text-xs font-black text-slate-400">点击上传舌苔照片</span>
                           </>
                         )}
                         <input ref={tongueInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'tongue')} />
                      </div>
                   </div>

                   {/* Face Photo */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">面部照片 (辨别气色状态)</label>
                      <div 
                        onClick={() => faceInputRef.current?.click()}
                        className="relative h-44 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-emerald-500 transition-all"
                      >
                         {formData.facePhoto ? (
                           <img src={formData.facePhoto} alt="Face" className="w-full h-full object-cover" />
                         ) : (
                           <>
                             <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                                <UserCircle size={32} />
                             </div>
                             <span className="text-xs font-black text-slate-400">点击上传面部照片</span>
                           </>
                         )}
                         <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'face')} />
                      </div>
                   </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-start space-x-3 border border-amber-100 dark:border-amber-900/30">
                   <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-[11px] text-amber-800 dark:text-amber-200/70 leading-relaxed">
                     拍摄提示：请在自然光线下拍摄，舌苔照片请尽量自然伸出舌头。这些照片仅用于 AI 中医体质分析，我们将严格保护您的隐私。
                   </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Actions */}
      {!isAnalyzing && (
        <div className="p-6 pb-12 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
          <button
            onClick={handleNext}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{step === 6 ? '完成并生成报告' : '继续下一步'}</span>
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
};

export default HealthQuestionnaire;

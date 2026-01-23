
import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { PatientProfile, NursingScores } from '../types';
import { NURSING_ICONS } from '../constants';
import { AlertCircle, RefreshCw, Watch, ChevronRight, Sparkles, Play, Lightbulb, TrendingUp, BrainCircuit, CalendarDays, ArrowUpRight, X, ArrowRight, Loader2, CheckCircle2, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { fetchWearableMetrics } from '../services/healthService';
import { generatePersonalizedPlan, PersonalizedPlan } from '../services/geminiService';

interface DashboardProps {
  profile: PatientProfile;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
  onSelectNursing: (nursing: keyof NursingScores) => void;
  updatedCategory?: keyof NursingScores | null;
  onStartReport: () => void;
  onStartAssessment: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, onUpdateProfile, onSelectNursing, updatedCategory, onStartReport, onStartAssessment }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPlanOverlay, setShowPlanOverlay] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [personalizedPlan, setPersonalizedPlan] = useState<PersonalizedPlan | null>(null);

  const chartData = [
    { subject: '饮食调养', A: profile.scores.diet },
    { subject: '运动调养', A: profile.scores.exercise },
    { subject: '睡眠调养', A: profile.scores.sleep },
    { subject: '心理调养', A: profile.scores.mental },
    { subject: '功能调养', A: profile.scores.function },
  ];

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const data = await fetchWearableMetrics();
      onUpdateProfile({
        scores: { ...profile.scores, ...data.scores },
        wearable: { ...profile.wearable, isConnected: true, lastSync: new Date().toISOString() }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGetPlan = async () => {
    if (!profile.isQuestionnaireComplete) {
      onStartAssessment();
      return;
    }
    setShowPlanOverlay(true);
    setIsGeneratingPlan(true);
    try {
      const plan = await generatePersonalizedPlan(profile);
      setPersonalizedPlan(plan);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="p-5 space-y-6 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Questionnaire Reminder Banner - CRITICAL FOR VIP/NON-VIP */}
      {!profile.isQuestionnaireComplete && (
        <button 
          onClick={onStartAssessment}
          className="w-full bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-100 dark:border-rose-800 rounded-[32px] p-6 text-left flex items-center justify-between group active:scale-[0.98] transition-all"
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
               <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-tight">请立即完成康复评估</h3>
              <p className="text-[11px] text-rose-600/70 dark:text-rose-400/60 font-bold mt-1 leading-relaxed">
                {profile.isVIP ? '您已是尊享会员，但' : ''}缺少您的病情数据，专家团队无法为您生成康复方案。
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-rose-300 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Personalized Plan Overlay */}
      {showPlanOverlay && (
        <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500">
          <header className="px-6 pt-12 pb-6 flex justify-between items-center border-b border-slate-100 dark:border-white/5">
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center">
              <Sparkles size={18} className="mr-2 text-emerald-500" />
              今日专属方案
            </h2>
            <button onClick={() => setShowPlanOverlay(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-slate-400 dark:text-white/50"><X size={20} /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isGeneratingPlan ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative">
                  <Loader2 size={48} className="text-emerald-500 animate-spin" />
                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-slate-800 dark:text-white font-black text-lg">正在构建您的康复路径...</h3>
                  <p className="text-slate-400 text-xs mt-1">基于五养指标与临床大数据实时生成</p>
                </div>
              </div>
            ) : personalizedPlan ? (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-[32px] p-7 border border-emerald-100 dark:border-white/10">
                   <h3 className="text-emerald-600 dark:text-emerald-400 text-sm font-black uppercase tracking-widest mb-2">{personalizedPlan.title}</h3>
                   <p className="text-slate-700 dark:text-slate-100 text-base font-bold leading-relaxed">{personalizedPlan.summary}</p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">核心行动指令</h4>
                  {personalizedPlan.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-white/5 rounded-[28px] p-6 border border-slate-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-white dark:bg-white/5 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">{NURSING_ICONS[item.category]}</div>
                        <div className="flex-1">
                          <h5 className="text-slate-800 dark:text-white font-black text-base mb-1">{item.title}</h5>
                          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-4">{item.description}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">行动计划</span>
                            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-400/20">
                              <span>{item.action}</span>
                              <ArrowRight size={14} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full bg-emerald-600 rounded-[28px] p-6 text-white flex items-center justify-between shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                   <div className="flex items-center space-x-3">
                     <CheckCircle2 size={24} />
                     <div className="flex flex-col text-left">
                       <span className="text-xs font-black uppercase tracking-widest opacity-80">一键同步</span>
                       <span className="font-bold">应用至今日计划</span>
                     </div>
                   </div>
                   <div className="bg-white/20 p-3 rounded-2xl"><ArrowRight size={20} /></div>
                </button>
              </div>
            ) : (
              <div className="text-center py-20"><p className="text-slate-400">方案生成失败，请重试</p></div>
            )}
          </div>
        </div>
      )}

      {/* Daily Report Trigger */}
      <button 
        onClick={onStartReport}
        className="w-full bg-slate-800 dark:bg-slate-900 rounded-[36px] p-7 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group active:scale-95 transition-all border border-slate-700 dark:border-slate-800"
      >
        <div className="relative z-10 flex justify-between items-center text-left">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Personal Broadcast</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">收听康复简报</h2>
            <p className="text-slate-400 text-xs mt-1 font-bold">林教练已为您准备好今日洞察</p>
          </div>
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform duration-500">
            <Play fill="white" size={28} className="ml-1 text-white" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
      </button>

      {/* Main Stats Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="flex justify-between items-center mb-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">综合康复状态指数</span>
            <div className="flex items-center space-x-3">
              <span className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">82.4</span>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-[10px] font-black bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100/50 dark:border-emerald-800">
                <TrendingUp size={12} className="mr-1" />+2.1%
              </div>
            </div>
          </div>
          <button onClick={handleSync} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <RefreshCw size={22} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-60 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="90%" 
              data={chartData}
              margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
            >
              <PolarGrid stroke="#f1f5f9" className="dark:opacity-5" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} 
              />
              <Radar name="Score" dataKey="A" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.1} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative group overflow-hidden rounded-[40px] transition-all duration-500 hover:translate-y-[-2px]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-emerald-600/10 opacity-40 dark:opacity-20 blur-2xl transition-opacity"></div>
        <div className="relative bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 p-7 rounded-[40px] shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4 text-left">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-emerald-500 dark:to-emerald-600 rounded-[22px] flex items-center justify-center text-slate-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent"><BrainCircuit size={28} /></div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">AI 深度洞察</h3>
                <span className="flex items-center text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md uppercase tracking-[0.1em] border border-emerald-100 dark:border-emerald-800 mt-1"><Sparkles size={10} className="mr-1" /> 算法推送</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-emerald-500 transition-colors"><Lightbulb size={20} /></div>
          </div>
          <div className="space-y-4">
            <div className="p-5 bg-slate-100/40 dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900/30 rounded-[28px] border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
              <div className="flex items-start space-x-3 relative z-10 text-left">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0"></div>
                <div className="flex-1">
                  <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold">分析发现：您的<span className="text-slate-900 dark:text-slate-100 font-black">睡眠深度</span>与<span className="text-slate-900 dark:text-slate-100 font-black">步数指标</span>呈现高度相关。昨日步数突破 4000 后，深度睡眠增加了 22 分钟。</p>
                  <div className="flex justify-center mt-5">
                    <button onClick={handleGetPlan} className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all group/btn bg-emerald-50 dark:bg-emerald-400/10 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-400/20 active:scale-95 shadow-sm">
                      <span className="text-[11px] font-black whitespace-nowrap">{profile.isQuestionnaireComplete ? '获取个性化方案' : '完善评估解锁方案'}</span>
                      <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:translate-y-[-0.5px] transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {['#指标优化', '#生活模式'].map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-[8.5px] font-black text-slate-400 shadow-sm whitespace-nowrap">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard onClick={() => onSelectNursing('exercise')} title="运动调养" score={profile.scores.exercise} label="今日步行 4.2km" icon={NURSING_ICONS.exercise} isHighlighted={updatedCategory === 'exercise'} />
        <MetricCard onClick={() => onSelectNursing('diet')} title="饮食调养" score={profile.scores.diet} label="三餐营养均衡" icon={NURSING_ICONS.diet} isHighlighted={updatedCategory === 'diet'} />
        <MetricCard onClick={() => onSelectNursing('mental')} title="心理调养" score={profile.scores.mental} label="情绪波动较低" icon={NURSING_ICONS.mental} isHighlighted={updatedCategory === 'mental'} />
        <MetricCard onClick={() => onSelectNursing('sleep')} title="睡眠调养" score={profile.scores.sleep} label="平均深度 1.2h" icon={NURSING_ICONS.sleep} isHighlighted={updatedCategory === 'sleep'} />
        <div className="col-span-2"><MetricCard onClick={() => onSelectNursing('function')} title="功能调养" score={profile.scores.function} label="呼吸训练已达标" icon={NURSING_ICONS.function} isHighlighted={updatedCategory === 'function'} horizontal /></div>
      </div>
    </div>
  );
};

const StatusPill: React.FC<{ score: number }> = ({ score }) => {
  const status = score >= 80 ? '优' : score >= 60 ? '良' : '中';
  const colorClass = score >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800' : 
                     score >= 60 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' : 
                     'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800';
  return (<div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-widest uppercase shrink-0 ${colorClass}`}>{status}</div>);
};

const MetricCard: React.FC<{ title: string; score: number; label: string; icon: React.ReactNode; onClick: () => void; isHighlighted?: boolean; horizontal?: boolean }> = ({ title, score, label, icon, onClick, isHighlighted, horizontal }) => {
  return (
    <button onClick={onClick} className={`p-6 rounded-[36px] border transition-all active:scale-[0.97] group w-full relative overflow-hidden flex flex-col items-start ${isHighlighted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-emerald-200/50'}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] -mr-10 -mt-10 opacity-10 transition-colors ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
      <div className="flex w-full justify-between items-start relative z-10 mb-3"><div className="p-1 rounded-xl text-emerald-500/80 dark:text-emerald-400 transition-transform group-hover:scale-110">{icon}</div><StatusPill score={score} /></div>
      <div className={`relative z-10 w-full text-left flex ${horizontal ? 'flex-row items-center justify-between' : 'flex-col'}`}>
        <div className="flex flex-col flex-1 space-y-1.5"><div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.15em]">{title}</div><div className="flex items-baseline space-x-1.5"><span className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">{score}</span><ChevronRight size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" /></div><div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate tracking-tight opacity-70 mt-1.5">{label}</div></div>
        {horizontal && (<div className="flex items-end space-x-1 h-10 ml-4 pb-1 shrink-0">{[40, 55, 48, 62, 58, 70, score].map((h, i) => (<div key={i} className={`w-1 rounded-full transition-all duration-1000 ${i === 6 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ height: `${(h / 100) * 100}%` }}></div>))}</div>)}
      </div>
    </button>
  );
};

export default Dashboard;

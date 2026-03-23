import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { PatientProfile, NursingScores } from '../types';
import { NURSING_ICONS } from '../constants';
import { RefreshCw, ChevronRight, Sparkles, Play, Lightbulb, TrendingUp, BrainCircuit, X, ArrowUpRight, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { fetchWearableMetrics } from '../services/healthService';
import { generatePersonalizedPlan, PersonalizedPlan } from '../services/geminiService';

interface HomeProps {
  profile: PatientProfile;
  unreadCount: number;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
  onSelectNursing: (nursing: keyof NursingScores) => void;
  updatedCategory?: keyof NursingScores | null;
  onStartReport: () => void;
  onStartAssessment: () => void;
}

const Home: React.FC<HomeProps> = ({ profile, unreadCount, onUpdateProfile, onSelectNursing, updatedCategory, onStartReport, onStartAssessment }) => {
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
    <div className="p-5 space-y-8 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Questionnaire Reminder Banner */}
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
              <h3 className="text-base font-black text-rose-700 dark:text-rose-400 uppercase tracking-tight">请立即完成康复评估</h3>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/60 font-bold mt-1 leading-relaxed">
                {profile.isVIP ? '您已是尊享会员，但' : ''}缺少您的病情数据，专家团队无法为您生成康复方案。
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-rose-300 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* Main Stats Card - Radar Chart Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[44px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">综合康复状态指数</span>
            <div className="flex items-center space-x-3">
              <span className="text-6xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">82.4</span>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-black bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100/50 dark:border-emerald-800">
                <TrendingUp size={14} className="mr-1" />+2.1%
              </div>
            </div>
          </div>
          <button onClick={handleSync} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-72 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="85%" 
              data={chartData}
              margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
            >
              <PolarGrid stroke="#f1f5f9" className="dark:opacity-10" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#64748b', fontSize: 13, fontWeight: 900 }} 
              />
              <Radar name="Score" dataKey="A" stroke="#10b981" strokeWidth={4} fill="#10b981" fillOpacity={0.15} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="relative group overflow-hidden rounded-[40px] transition-all duration-500 hover:translate-y-[-2px]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-emerald-600/10 opacity-40 dark:opacity-20 blur-2xl transition-opacity"></div>
        <div className={`relative bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl border-2 p-8 rounded-[44px] shadow-sm transition-all ${unreadCount > 0 ? 'border-emerald-500 dark:border-emerald-400 ring-4 ring-emerald-500/10' : 'border-white dark:border-slate-800'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4 text-left">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-emerald-500 dark:to-emerald-600 rounded-[24px] flex items-center justify-center text-slate-600 dark:text-white shadow-sm border border-slate-200 dark:border-transparent relative">
                <BrainCircuit size={32} />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse shadow-lg">
                    {unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">AI 深度洞察</h3>
                <span className="flex items-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md uppercase tracking-[0.1em] border border-emerald-100 dark:border-emerald-800 mt-1.5"><Sparkles size={12} className="mr-1" /> 算法推送</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 group-hover:text-emerald-500 transition-colors relative">
               <Lightbulb size={24} />
               {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>}
            </div>
          </div>
          <div className="space-y-5">
            <div className="p-6 bg-slate-100/40 dark:bg-gradient-to-br dark:from-slate-800/80 dark:to-slate-900/30 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
              <div className="flex items-start space-x-4 relative z-10 text-left">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2.5 shrink-0"></div>
                <div className="flex-1">
                  {unreadCount > 0 ? (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed font-black">
                      林教练发现了新的干预机会！您有 {unreadCount} 条未读建议，请点击下方进入“五养教练”查看详情。
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-bold">
                      分析发现：您的<span className="text-slate-900 dark:text-slate-100 font-black px-1">睡眠深度</span>与<span className="text-slate-900 dark:text-slate-100 font-black px-1">步数指标</span>呈现高度相关。昨日步数突破 4000 后，深度睡眠增加了 22 分钟。
                    </p>
                  )}
                  <div className="flex justify-center mt-6">
                    <button onClick={handleGetPlan} className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-all group/btn bg-emerald-50 dark:bg-emerald-400/10 px-6 py-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-400/20 active:scale-95 shadow-sm">
                      <span className="text-xs font-black whitespace-nowrap">{profile.isQuestionnaireComplete ? '获取个性化方案' : '完善评估解锁方案'}</span>
                      <ArrowUpRight size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:translate-y-[-0.5px] transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-5">
        <MetricCard onClick={() => onSelectNursing('exercise')} title="运动调养" score={profile.scores.exercise} label="今日步行 4.2km" icon={NURSING_ICONS.exercise} isHighlighted={updatedCategory === 'exercise'} />
        <MetricCard onClick={() => onSelectNursing('diet')} title="饮食调养" score={profile.scores.diet} label="三餐营养均衡" icon={NURSING_ICONS.diet} isHighlighted={updatedCategory === 'diet'} />
        <MetricCard onClick={() => onSelectNursing('mental')} title="心理调养" score={profile.scores.mental} label="情绪波动较低" icon={NURSING_ICONS.mental} isHighlighted={updatedCategory === 'mental'} />
        <MetricCard onClick={() => onSelectNursing('sleep')} title="睡眠调养" score={profile.scores.sleep} label="平均深度 1.2h" icon={NURSING_ICONS.sleep} isHighlighted={updatedCategory === 'sleep'} />
        <div className="col-span-2">
            <MetricCard onClick={() => onSelectNursing('function')} title="功能调养" score={profile.scores.function} label="呼吸训练已达标" icon={NURSING_ICONS.function} isHighlighted={updatedCategory === 'function'} horizontal />
        </div>
      </div>
    </div>
  );
};

const StatusPill: React.FC<{ score: number }> = ({ score }) => {
  const status = score >= 80 ? '优' : score >= 60 ? '良' : '中';
  const colorClass = score >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' : 
                     score >= 60 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 
                     'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
  return (<div className={`px-3 py-1 rounded-full border text-[11px] font-black tracking-widest uppercase shrink-0 ${colorClass}`}>{status}</div>);
};

const MetricCard: React.FC<{ title: string; score: number; label: string; icon: React.ReactNode; onClick: () => void; isHighlighted?: boolean; horizontal?: boolean }> = ({ title, score, label, icon, onClick, isHighlighted, horizontal }) => {
  return (
    <button onClick={onClick} className={`p-7 rounded-[40px] border-2 transition-all active:scale-[0.97] group w-full relative overflow-hidden flex flex-col items-start ${isHighlighted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 shadow-sm hover:border-emerald-200/50'}`}>
      <div className={`absolute top-0 right-0 w-40 h-40 blur-[70px] -mr-12 -mt-12 opacity-10 transition-colors ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
      <div className="flex w-full justify-between items-start relative z-10 mb-4">
        <div className="p-1.5 rounded-2xl bg-slate-50 dark:bg-white/5 text-emerald-500 dark:text-emerald-400 transition-transform group-hover:scale-110">{icon}</div>
        <StatusPill score={score} />
      </div>
      <div className={`relative z-10 w-full text-left flex ${horizontal ? 'flex-row items-center justify-between' : 'flex-col'}`}>
        <div className="flex flex-col flex-1 space-y-2">
            <div className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">{title}</div>
            <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">{score}</span>
                <ChevronRight size={18} className="text-slate-200 dark:text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-black truncate tracking-tight opacity-90 mt-2">{label}</div>
        </div>
        {horizontal && (
            <div className="flex items-end space-x-1.5 h-12 ml-6 pb-1 shrink-0">
                {[40, 55, 48, 62, 58, 70, score].map((h, i) => (
                    <div key={i} className={`w-1.5 rounded-full transition-all duration-1000 ${i === 6 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ height: `${(h / 100) * 100}%` }}></div>
                ))}
            </div>
        )}
      </div>
    </button>
  );
};

export default Home;

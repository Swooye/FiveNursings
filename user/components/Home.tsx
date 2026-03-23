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

      {/* [RESTORED] Daily Report Trigger Section */}
      <button 
        onClick={onStartReport}
        className="w-full bg-slate-800 dark:bg-slate-900 rounded-[36px] p-7 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group active:scale-95 transition-all border border-slate-700 dark:border-slate-800"
      >
        <div className="relative z-10 flex justify-between items-center text-left">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Personal Broadcast</span>
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

      {/* Main Stats Card - Radar Chart Section with Extra Large Fonts */}
      <div className="bg-white dark:bg-slate-900 rounded-[48px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">综合康复状态指数</span>
            <div className="flex items-center space-x-3">
              <span className="text-7xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">82.4</span>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-black bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100/50 dark:border-emerald-800">
                <TrendingUp size={16} className="mr-1" />+2.1%
              </div>
            </div>
          </div>
          <button onClick={handleSync} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all active:scale-90 border border-slate-100 dark:border-slate-800">
            <RefreshCw size={28} className={isSyncing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-80 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart 
              cx="50%" 
              cy="50%" 
              outerRadius="80%" 
              data={chartData}
              margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
            >
              <PolarGrid stroke="#f1f5f9" className="dark:opacity-10" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#334155', fontSize: 16, fontWeight: 900 }} 
              />
              <Radar name="Score" dataKey="A" stroke="#10b981" strokeWidth={5} fill="#10b981" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metric Cards Grid - Extra Large Content */}
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
  return (<div className={`px-4 py-1.5 rounded-full border text-[13px] font-black tracking-widest uppercase shrink-0 ${colorClass}`}>{status}</div>);
};

const MetricCard: React.FC<{ title: string; score: number; label: string; icon: React.ReactNode; onClick: () => void; isHighlighted?: boolean; horizontal?: boolean }> = ({ title, score, label, icon, onClick, isHighlighted, horizontal }) => {
  return (
    <button onClick={onClick} className={`p-8 rounded-[48px] border-2 transition-all active:scale-[0.97] group w-full relative overflow-hidden flex flex-col items-start ${isHighlighted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 shadow-sm hover:border-emerald-200/50'}`}>
      <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-16 -mt-16 opacity-10 transition-colors ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
      <div className="flex w-full justify-between items-start relative z-10 mb-6">
        <div className="p-2 rounded-2xl bg-slate-50 dark:bg-white/5 text-emerald-500 dark:text-emerald-400 transition-transform group-hover:scale-110 scale-125">{icon}</div>
        <StatusPill score={score} />
      </div>
      <div className={`relative z-10 w-full text-left flex ${horizontal ? 'flex-row items-center justify-between' : 'flex-col'}`}>
        <div className="flex flex-col flex-1 space-y-3">
            <div className="text-base text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">{title}</div>
            <div className="flex items-baseline space-x-2">
                <span className="text-6xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">{score}</span>
                <ChevronRight size={24} className="text-slate-200 dark:text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500 font-black truncate tracking-tight opacity-90 mt-2">{label}</div>
        </div>
        {horizontal && (
            <div className="flex items-end space-x-2 h-16 ml-8 pb-1 shrink-0">
                {[40, 55, 48, 62, 58, 70, score].map((h, i) => (
                    <div key={i} className={`w-2 rounded-full transition-all duration-1000 ${i === 6 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]' : 'bg-slate-100 dark:bg-slate-800'}`} style={{ height: `${(h / 100) * 100}%` }}></div>
                ))}
            </div>
        )}
      </div>
    </button>
  );
};

export default Home;


import React, { useState } from 'react';
import { ArrowLeft, Crown, CheckCircle2, Zap, ShoppingBag, Headset, Calendar, Heart, ShieldCheck, Sparkles, ChevronRight, Gift } from 'lucide-react';
import { PatientProfile } from '../types';

interface MembershipCenterProps {
  profile: PatientProfile;
  onBack: () => void;
  onSubscribe: () => void;
}

const MembershipCenter: React.FC<MembershipCenterProps> = ({ profile, onBack, onSubscribe }) => {
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('year');

  const benefits = [
    { icon: <Sparkles className="text-amber-400" />, title: "五治五养 AI 全天候互动", desc: "专属算法支持，实时调整康复计划" },
    { icon: <ShoppingBag className="text-amber-400" />, title: "商城养生包全场 7 折", desc: "回本神器，每单立减百元起" },
    { icon: <ShieldCheck className="text-amber-400" />, title: "林主任团队专业背书产品", desc: "会员专享高品质康复好物 Access" },
    { icon: <Headset className="text-amber-400" />, title: "健康教练月度主动关怀", desc: "每月一次深度视频/图文回访" },
    { icon: <Heart className="text-amber-400" />, title: "穿戴设备深度集成管理", desc: "自动监测心率、睡眠，风险预警优先处理" }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col animate-in slide-in-from-bottom duration-500 pb-32 no-scrollbar">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-20"></div>
      
      <header className="px-6 pt-12 pb-6 sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between">
        <button onClick={onBack} className="p-2.5 bg-white/5 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight">会员中心</h1>
        <button className="p-2.5 bg-white/5 rounded-2xl text-amber-400"><Crown size={20} /></button>
      </header>

      <main className="px-6 space-y-10 relative z-10">
        {/* User Card */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[40px] p-8 shadow-2xl shadow-amber-500/20 relative overflow-hidden group">
          <div className="relative z-10 flex items-center space-x-6">
            <div className="w-16 h-16 bg-white/20 rounded-3xl p-1 backdrop-blur-md">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} className="w-full h-full rounded-2xl bg-white" alt="Avatar" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{profile.name}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                {profile.isVIP ? `VIP 会员 · ${profile.vipExpiry} 到期` : '尚未开通五养尊享会员'}
              </p>
            </div>
          </div>
          <Crown size={120} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
        </div>

        {/* ROI Logic */}
        {!profile.isVIP && (
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 text-center">
            <div className="flex justify-center -space-x-2 mb-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} className="w-8 h-8 rounded-full" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-amber-500 flex items-center justify-center text-[10px] font-black">+8k</div>
            </div>
            <p className="text-sm font-bold text-amber-200">已有 8,230 位用户通过会员权益</p>
            <p className="text-[11px] text-slate-400 mt-1">平均每年节省康复费用 <span className="text-white font-black">¥1,280.00</span></p>
          </div>
        )}

        {/* Benefits List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">尊享五大核心权益</h3>
          <div className="grid grid-cols-1 gap-3">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-[28px] p-5 flex items-start space-x-4">
                <div className="p-3 bg-white/5 rounded-2xl">{b.icon}</div>
                <div>
                  <h4 className="text-sm font-black text-slate-100">{b.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">选择订阅计划</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setSelectedPlan('month')}
              className={`p-6 rounded-[32px] border-2 text-left transition-all relative ${selectedPlan === 'month' ? 'bg-amber-500/10 border-amber-500' : 'bg-white/5 border-transparent'}`}
            >
              <div className="text-[10px] font-black text-slate-400 uppercase mb-2">月度订阅</div>
              <div className="text-2xl font-black">¥128</div>
              <div className="text-[9px] text-slate-500 mt-1">约 ¥4.2/天</div>
              {selectedPlan === 'month' && <CheckCircle2 size={16} className="absolute top-4 right-4 text-amber-500" />}
            </button>
            <button 
              onClick={() => setSelectedPlan('year')}
              className={`p-6 rounded-[32px] border-2 text-left transition-all relative ${selectedPlan === 'year' ? 'bg-amber-500/10 border-amber-500' : 'bg-white/5 border-transparent'}`}
            >
              <div className="absolute -top-3 left-4 bg-amber-500 text-slate-900 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">最超值</div>
              <div className="text-[10px] font-black text-slate-400 uppercase mb-2">年度订阅</div>
              <div className="text-2xl font-black">¥998</div>
              <div className="text-[9px] text-slate-500 mt-1">立省 ¥538/年</div>
              {selectedPlan === 'year' && <CheckCircle2 size={16} className="absolute top-4 right-4 text-amber-500" />}
            </button>
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <button 
          onClick={onSubscribe}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-5 rounded-[24px] font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-3"
        >
          <Zap size={18} fill="currentColor" />
          <span>立即开通尊享会员</span>
        </button>
        <p className="text-[9px] text-slate-600 text-center mt-4">订阅即代表同意《会员服务协议》和《自动续费协议》</p>
      </div>
    </div>
  );
};

export default MembershipCenter;

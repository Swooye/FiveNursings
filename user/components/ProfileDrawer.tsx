import React from 'react';
import { 
  X, ChevronRight, Settings, FileText, MessageSquare, 
  Bell, ShieldCheck, PlayCircle, Edit3, ClipboardCheck, Sparkles 
} from 'lucide-react';
import { PatientProfile } from '../types';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PatientProfile;
  onSettingsClick?: () => void;
  onServiceClick?: (serviceId: string) => void;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ isOpen, onClose, profile, onSettingsClick, onServiceClick }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[200] flex animate-in fade-in duration-300">
      {/* 背景遮罩 (Overlay) */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 抽屉内容区 */}
      <div className="relative w-[85%] max-w-sm bg-slate-50 dark:bg-slate-950 shadow-2xl h-full flex flex-col animate-in slide-in-from-left duration-500 overflow-hidden text-left">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          
          {/* 用户信息头部 */}
          <div className="px-6 pt-14 pb-8 bg-white dark:bg-slate-900">
             <div className="flex justify-between items-start mb-8">
                <div className="flex items-center space-x-4">
                   {/* 头像 */}
                   <div className="w-16 h-16 rounded-full border-2 border-emerald-100 dark:border-emerald-900/30 p-0.5 shrink-0">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name || profile.nickname || 'User'}`} className="w-full h-full rounded-full bg-slate-50" alt="Avatar" />
                   </div>
                   <div className="min-w-0">
                      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center truncate">
                        {profile.name || profile.nickname || '用户'}
                        {profile.isVIP && <ShieldCheck size={14} className="ml-1.5 text-amber-500 shrink-0" />}
                      </h2>
                      <button className="text-[11px] font-bold text-slate-400 flex items-center mt-1 active:scale-95 transition-transform" onClick={onSettingsClick}>
                        订单 · 设置 <ChevronRight size={10} className="ml-0.5" />
                      </button>
                   </div>
                </div>
                {/* 设置按钮 */}
                <button onClick={onSettingsClick} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 active:scale-90 transition-transform">
                  <Settings size={18} />
                </button>
             </div>

             {/* 核心服务列表 */}
             <div className="space-y-3">
                <ServiceRow icon={<FileText size={18} />} title="健康档案" desc="查看舌面影像辨证结果" color="emerald" onClick={() => onServiceClick?.('health-record')} />
                <ServiceRow icon={<PlayCircle size={18} />} title="康复简报" desc="收听今日五养指标解读" color="blue" onClick={() => onServiceClick?.('report')} />
                <ServiceRow icon={<Edit3 size={18} />} title="康复日记" desc="智能记录您的康复点滴" color="amber" onClick={() => onServiceClick?.('diary')} />
                <ServiceRow icon={<ClipboardCheck size={18} />} title="康复计划" desc="动态调整每日五养目标" color="purple" onClick={() => onServiceClick?.('plan')} />
                <ServiceRow icon={<Bell size={18} />} title="家属通知" desc="风险同步与紧急联系设置" color="rose" onClick={() => onServiceClick?.('safety')} />
             </div>
          </div>

          {/* 专业服务/教练卡片 */}
          <div className="mt-4 px-6 space-y-4">
             <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">专业服务</h3>
             <button onClick={() => onServiceClick?.('coach')} className="w-full bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-1 shrink-0">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full rounded-xl object-cover" alt="Coach" />
                   </div>
                   <div className="text-left min-w-0">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">林教练 · 专属AI教练</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate">智能响应</p>
                   </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl shrink-0"><MessageSquare size={16} /></div>
             </button>
          </div>
        </div>

        {/* 底部品牌标识 */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center flex items-center justify-center space-x-2">
           <Sparkles size={14} className="text-emerald-500" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">康养家 AI 交互系统</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileDrawer;

/**
 * 服务行组件
 */
interface ServiceRowProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
  onClick: () => void;
}

const ServiceRow: React.FC<ServiceRowProps> = ({ icon, title, desc, color, onClick }) => (
  <button onClick={onClick} className={`w-full p-4 rounded-[28px] flex items-center space-x-4 text-left transition-all active:scale-[0.98] group relative overflow-hidden ${
    color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/10' :
    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10' :
    color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/10' :
    color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/10' :
    'bg-rose-50 dark:bg-rose-900/10'
  }`}>
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
      color === 'emerald' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
      color === 'blue' ? 'bg-blue-500 text-white shadow-blue-500/20' :
      color === 'amber' ? 'bg-amber-500 text-white shadow-amber-500/20' :
      color === 'purple' ? 'bg-purple-500 text-white shadow-purple-500/20' :
      'bg-rose-500 text-white shadow-rose-500/20'
    }`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-black text-slate-800 dark:text-slate-100">{title}</p>
      <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5 uppercase tracking-wide">{desc}</p>
    </div>
    <ChevronRight size={16} className="text-slate-300" />
  </button>
);

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, ChevronRight, Sparkles, ArrowRight, Moon, TrendingUp, Activity } from 'lucide-react';
import { PatientProfile } from '../../../types';

interface AIInsightsWidgetProps {
  profile: PatientProfile;
}

const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({ profile }) => {
  // 动态根据用户数据生成 Insights，此处使用模拟数据结合真实得分
  const INSIGHT_CARDS = [
    {
      id: 'insight_1',
      title: '整体康复趋势平稳',
      description: `监测到您今日的康复指数达 ${profile.coreRecoveryIndex || 80} 分${(profile.dailyChange && profile.dailyChange.includes('-')) ? '，有小幅下降，无需紧张。' : '，表现优异。'
        }`,
      action: '查看详细报告',
      icon: <Activity className="text-blue-500" size={24} />,
    },
    {
      id: 'insight_2',
      title: '随访指标分析',
      description: '结合您近期的睡眠和功能记录，五养AI发现您的睡眠时长有待提升。',
      action: '咨询改善建议',
      icon: <Moon className="text-amber-500" size={24} />,
    },
    {
      id: 'insight_3',
      title: '运动强度达标',
      description: '连续3天完成中等强度散步，心肺功能指标稳步提升。',
      action: '查看进阶计划',
      icon: <TrendingUp className="text-emerald-500" size={24} />,
    }
  ];

  const [insightIndex, setInsightIndex] = useState(0);

  const handleNext = () => setInsightIndex((prev) => (prev + 1) % INSIGHT_CARDS.length);
  const handlePrev = () => setInsightIndex((prev) => (prev - 1 + INSIGHT_CARDS.length) % INSIGHT_CARDS.length);

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center space-x-2">
          <BrainCircuit size={18} className="text-emerald-500" />
          <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">AI 康复洞察</h3>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <button onClick={handlePrev} className="p-1 text-slate-300 hover:text-emerald-500 transition-colors">
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {insightIndex + 1} / {INSIGHT_CARDS.length}
            </span>
            <button onClick={handleNext} className="p-1 text-slate-300 hover:text-emerald-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 堆叠卡片容器 */}
      <div className="relative h-[250px] focus:outline-none" style={{ perspective: '1000px' }}>
        <AnimatePresence mode="popLayout">
          {[...Array(3)].map((_, i) => {
            const index = (insightIndex + i) % INSIGHT_CARDS.length;
            const card = INSIGHT_CARDS[index];
            const isTop = i === 0;

            return (
              <motion.div
                key={card.id + index}
                style={{ zIndex: 3 - i, position: 'absolute', width: '100%', top: 0, left: 0 }}
                initial={{ scale: 0.9 - i * 0.05, y: i * 12, opacity: 1 - i * 0.3 }}
                animate={{ scale: 1 - i * 0.05, y: i * 12, opacity: 1 - i * 0.3 }}
                exit={{ x: 300, opacity: 0, rotate: 15, transition: { duration: 0.3 } }}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100) handlePrev();
                  else if (info.offset.x < -100) handleNext();
                }}
                className={`bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-xl h-[220px] ${isTop ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <div className="h-full flex flex-col text-left">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">{card.icon}</div>
                    <div className="flex items-center space-x-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full">
                      <Sparkles size={12} />
                      <span className="text-[10px] font-black uppercase tracking-wider">AI 洞察</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">{card.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{card.description}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-black">
                      <span>{card.action}</span>
                      <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIInsightsWidget;

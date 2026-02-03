
import React from 'react';
import { VoiceLog } from '../types';
import { ArrowLeft, Calendar, Mic, Sparkles, TrendingUp, Filter } from 'lucide-react';
import { NURSING_ICONS } from '../constants';

interface RecoveryJournalProps {
  logs: VoiceLog[];
  onBack: () => void;
}

const RecoveryJournal: React.FC<RecoveryJournalProps> = ({ logs, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 bg-white sticky top-0 z-40 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">康复日志</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recovery Journal</p>
          </div>
        </div>
        <button className="p-2 text-slate-400">
          <Filter size={20} />
        </button>
      </header>

      <div className="p-5 space-y-6">
        {logs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-16 h-16 bg-slate-200 rounded-3xl mb-4 flex items-center justify-center">
              <Calendar size={32} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-500">暂无康复记录</p>
            <p className="text-xs mt-1">使用语音助手开始记录您的康复点滴</p>
          </div>
        ) : (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-slate-200 before:to-transparent">
            {logs.map((log, index) => (
              <div key={log.id} className="relative pl-12 group">
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-110 ${
                  index === 0 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Mic size={16} />
                </div>

                {/* Log Card */}
                <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center space-x-1 text-emerald-600">
                      <TrendingUp size={12} />
                      <span className="text-xs font-black">+{log.impact.change}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed font-medium mb-4">
                    “{log.summary}”
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                        {NURSING_ICONS[log.impact.category]}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">影响指标: {log.impact.category}</span>
                    </div>
                    <div className="flex items-center text-emerald-500">
                      <Sparkles size={12} className="mr-1" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">AI 方案已更新</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecoveryJournal;

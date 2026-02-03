
import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, ShieldCheck, ChevronRight } from 'lucide-react';

interface ProtocolViewProps {
  onBack: () => void;
  initialTab?: 'service' | 'privacy';
}

const ProtocolView: React.FC<ProtocolViewProps> = ({ onBack, initialTab = 'service' }) => {
  const [activeTab, setActiveTab] = useState<'service' | 'privacy'>(initialTab);

  // Sync state if initialTab changes externally (e.g., user clicks one then the other from profile)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const protocols = {
    service: {
      title: '服务协议',
      content: `欢迎使用康养家康复管理平台。本协议是您与平台之间关于服务使用的法律合约。\n\n1. 服务说明：康养家利用AI技术为肿瘤患者提供康复建议。所有建议仅供参考，不作为医疗诊断依据。\n2. 用户义务：用户需提供真实准确的健康数据，以便AI进行更精准的分析。\n3. 免责声明：康复方案受个体差异影响，用户在执行重大运动或饮食变更前应咨询主治医生。\n4. 账号安全：请妥善保管您的登录信息，避免泄露个人健康隐私。`
    },
    privacy: {
      title: '隐私政策',
      content: `保护您的健康数据隐私是我们的首要任务。\n\n1. 数据收集：我们收集您的年龄、病种、阶段、穿戴设备数据及录音日志，用于生成个性化康复建议。\n2. 数据使用：数据仅用于您的康复看板展示及AI模型分析，未经许可不会向第三方泄露。\n3. 存储安全：我们采用行业标准的加密技术存储您的敏感健康档案。\n4. 用户权利：您可以随时在个人中心删除您的健康日志或注销账号。`
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 flex flex-col no-scrollbar shadow-2xl border-x border-slate-200 dark:border-slate-800">
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-4">
        <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">协议与政策</h1>
      </header>

      <main className="p-6 space-y-8 flex-1">
        <div className="flex space-x-2">
          {(['service', 'privacy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                activeTab === tab
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
              }`}
            >
              {protocols[tab].title}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex-1">
          <div className="flex items-center space-x-2 mb-6">
            {activeTab === 'service' ? (
              <FileText size={18} className="text-emerald-500" />
            ) : (
              <ShieldCheck size={18} className="text-emerald-500" />
            )}
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
              {protocols[activeTab].title}详情
            </span>
          </div>
          <div className="space-y-6">
            {protocols[activeTab].content.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {line}
              </p>
            ))}
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800 text-center">
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">
              Five-Nursings Protection Policy
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProtocolView;

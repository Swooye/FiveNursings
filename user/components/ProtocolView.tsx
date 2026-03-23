
import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.DEV ? "" : "https://api-u46fik5vcq-uc.a.run.app";

interface ProtocolViewProps {
  onBack: () => void;
  initialTab?: 'service' | 'privacy';
}

const ProtocolView: React.FC<ProtocolViewProps> = ({ onBack, initialTab = 'service' }) => {
  const [activeTab, setActiveTab] = useState<'service' | 'privacy'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [protocols, setProtocols] = useState({
    service: {
      title: '服务协议',
      content: `正在加载协议内容...`
    },
    privacy: {
      title: '隐私政策',
      content: `正在加载隐私条款...`
    }
  });

  useEffect(() => {
      const fetchProtocols = async () => {
          setLoading(true);
          try {
              // 统一使用 /api 前缀以匹配后端云函数路由
              const endpoint = `${API_URL}/api/protocols`;
              const response = await fetch(endpoint);
              if (response.ok) {
                  const data = await response.json();
                  const list = Array.isArray(data) ? data : (data.data || []);
                  
                  // 根据 key 匹配 (service_agreement / privacy_policy)
                  const service = list.find((p: any) => p.key === 'service_agreement');
                  const privacy = list.find((p: any) => p.key === 'privacy_policy');
                  
                  setProtocols(prev => ({
                      service: service ? { title: '服务协议', content: service.content } : prev.service,
                      privacy: privacy ? { title: '隐私政策', content: privacy.content } : prev.privacy
                  }));
              }
          } catch (e) {
              console.error("Failed to fetch protocols:", e);
          } finally {
              setLoading(false);
          }
      };
      fetchProtocols();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
          <div className="space-y-6 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {loading ? "正在同步最新协议..." : protocols[activeTab].content}
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

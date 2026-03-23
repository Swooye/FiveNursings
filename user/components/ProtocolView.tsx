
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
      content: `暂未获取到协议内容。`
    },
    privacy: {
      title: '隐私政策',
      content: `暂未获取到隐私政策。`
    }
  });

  useEffect(() => {
      const fetchProtocols = async () => {
          setLoading(true);
          try {
              // 尝试获取全量协议列表
              const response = await fetch(`${API_URL}/api/protocols`);
              if (response.ok) {
                  const rawData = await response.json();
                  const list = Array.isArray(rawData) ? rawData : (rawData.data || []);
                  
                  // 匹配 key
                  const service = list.find((p: any) => p.key === 'service_agreement');
                  const privacy = list.find((p: any) => p.key === 'privacy_policy');
                  
                  setProtocols({
                      service: { 
                          title: service?.title || '服务协议', 
                          content: service?.content || '欢迎使用康养家服务协议。' 
                      },
                      privacy: { 
                          title: privacy?.title || '隐私政策', 
                          content: privacy?.content || '我们非常重视您的个人信息保护。' 
                      }
                  });
              }
          } catch (e) {
              console.error("Fetch Protocols Error:", e);
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
              {tab === 'service' ? '服务协议' : '隐私政策'}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex-1">
          <div className="flex items-center space-x-2 mb-6">
            <FileText size={18} className="text-emerald-500" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
              {activeTab === 'service' ? '服务协议' : '隐私政策'}正文
            </span>
          </div>
          <div className="space-y-6 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {loading ? "正在同步云端内容..." : protocols[activeTab].content}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProtocolView;

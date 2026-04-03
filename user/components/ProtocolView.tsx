import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, ShieldCheck, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.DEV ? "" : "https://us-central1-fivenursings-73917017-a0dfd.cloudfunctions.net/api";

interface ProtocolViewProps {
  onBack?: () => void;
  onClose?: () => void; // 兼容 SettingsView 传入的 onClose
  initialTab?: 'service' | 'privacy';
  protocolKey?: string; // 兼容从其他地方直接传入 protocol key
}

const ProtocolView: React.FC<ProtocolViewProps> = ({ onBack, onClose, initialTab = 'service', protocolKey }) => {
  // 如果传入了 protocolKey，推导 activeTab
  const derivedInitialTab = protocolKey?.includes('privacy') ? 'privacy' : (protocolKey?.includes('service') ? 'service' : initialTab);
  
  const [activeTab, setActiveTab] = useState<'service' | 'privacy'>(derivedInitialTab);
  const [loading, setLoading] = useState(false);
  const [protocols, setProtocols] = useState({
    service: {
      title: '用户服务协议',
      content: `正在加载服务协议...`
    },
    privacy: {
      title: '隐私政策',
      content: `正在加载隐私政策...`
    }
  });

  const handleBack = () => {
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  useEffect(() => {
      const fetchProtocols = async () => {
          setLoading(true);
          try {
              const endpoint = `${API_URL}/api/protocols`;
              const response = await fetch(endpoint);
              if (response.ok) {
                  const rawData = await response.json();
                  // Admin 框架经常把数据包裹在 data 属性里，或者直接返回数组
                  const list = Array.isArray(rawData) ? rawData : (rawData.data || []);
                  
                  // 精准匹配逻辑：涵盖可能在后台创建的各种 key 名称
                  const service = list.find((p: any) => p.key === 'service' || p.key === 'user_service' || p.key === 'service_agreement');
                  const privacy = list.find((p: any) => p.key === 'privacy' || p.key === 'privacy_policy');
                  
                  setProtocols(prev => ({
                      service: { 
                          title: service?.title || prev.service.title, 
                          content: service?.content || '欢迎使用康养家服务。您需要同意服务协议才能使用各项功能。' 
                      },
                      privacy: { 
                          title: privacy?.title || prev.privacy.title, 
                          content: privacy?.content || '我们非常重视您的个人信息保护。未经您的授权，我们绝不向第三方泄露您的隐私数据。' 
                      }
                  }));
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
    if (protocolKey) {
        setActiveTab(protocolKey.includes('privacy') ? 'privacy' : 'service');
    } else {
        setActiveTab(initialTab);
    }
  }, [initialTab, protocolKey]);

  return (
    <div className="min-h-screen max-w-md mx-auto w-full bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 flex flex-col no-scrollbar shadow-2xl border-x border-slate-200 dark:border-slate-800">
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-4">
        <button onClick={handleBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active:scale-95 transition-transform hover:text-slate-600 dark:hover:text-slate-200">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">协议与政策</h1>
      </header>

      <main className="p-6 space-y-8 flex-1 flex flex-col">
        <div className="flex space-x-2">
          {(['service', 'privacy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                activeTab === tab
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {tab === 'service' ? '服务协议' : '隐私政策'}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex-1 relative overflow-y-auto custom-scrollbar">
          <div className="flex items-center space-x-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            {activeTab === 'service' ? (
              <FileText size={18} className="text-emerald-500" />
            ) : (
              <ShieldCheck size={18} className="text-emerald-500" />
            )}
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-wider">
              {protocols[activeTab].title}
            </span>
          </div>
          
          <div className="space-y-6 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium pb-10">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Loader2 size={24} className="animate-spin text-slate-400 mb-4" />
                    <p className="text-xs font-bold tracking-widest">同步数据中...</p>
                </div>
            ) : (
                protocols[activeTab].content
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProtocolView;

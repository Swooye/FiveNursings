
import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/firebase';
import { PatientProfile, CancerType, TreatmentStage, NursingScores, VoiceLog, CartItem, SKU, ChatSession } from './types';
import Home from './components/Home';
import Program from './components/Program';
import AIChat from './components/AIChat';
import Marketplace from './components/Marketplace';
import LiveVoiceAssistant from './components/LiveVoiceAssistant';
import NursingDetail from './components/NursingDetail';
import RecoveryJournal from './components/RecoveryJournal';
import DailyHealthReport from './components/DailyHealthReport';
import OrdersLogistics from './components/OrdersLogistics';
import CartView from './components/CartView';
import CompleteProfile from './components/CompleteProfile';
import HealthQuestionnaire from './components/HealthQuestionnaire';
import HealthRecord from './components/HealthRecord';
import SafetyWarningSettings from './components/SafetyWarningSettings';
import ProtocolView from './components/ProtocolView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import HumanCoachChat from './components/HumanCoachChat';
import MembershipCenter from './components/MembershipCenter';
import { NAV_ITEMS } from './constants';
import { 
  Mic, 
  Moon, 
  Sun, 
  ChevronRight, 
  LogOut, 
  FileText, 
  ShieldCheck, 
  ClipboardEdit, 
  ShoppingBag, 
  Settings,
  Headset,
  Crown,
  Gift,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [_, setForceUpdate] = useState(0);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [assistantMode, setAssistantMode] = useState<'chat' | 'logging' | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedNursing, setSelectedNursing] = useState<keyof NursingScores | null>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [showHealthRecord, setShowHealthRecord] = useState(false);
  const [showSafetySettings, setShowSafetySettings] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const [protocolType, setProtocolType] = useState<'service' | 'privacy' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHumanCoach, setShowHumanCoach] = useState(false);
  const [completeProfileMode, setCompleteProfileMode] = useState<'onboarding' | 'edit'>('onboarding');
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [lastUpdatedCategory, setLastUpdatedCategory] = useState<keyof NursingScores | null>(null);
  const [reportCache, setReportCache] = useState<{ date: string; profileJSON: string; text: string } | null>(null);

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => (localStorage.getItem('themeMode') as any) || 'system');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('font-size') || 'standard');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'zh');
  const [hapticFeedback, setHapticFeedback] = useState(() => localStorage.getItem('haptics') !== 'false');
  const [unitSystem, setUnitSystem] = useState(() => localStorage.getItem('units') || 'metric');

  const [isDarkEffective, setIsDarkEffective] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        setActiveTab('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (isDark: boolean) => {
      setIsDarkEffective(isDark);
      if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    };
    if (themeMode === 'system') {
      applyTheme(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(themeMode === 'dark');
    }
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    ['font-size-standard', 'font-size-large', 'font-size-extra', 'font-size-max'].forEach(c => root.classList.remove(c));
    root.classList.add(`font-size-${fontSize}`);
    localStorage.setItem('font-size', fontSize);
  }, [fontSize]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [profile, setProfile] = useState<PatientProfile>({
    id: 'user_123',
    name: '李先生',
    age: 52,
    cancerType: CancerType.OTHER,
    stage: TreatmentStage.UNTREATED,
    scores: { diet: 78, exercise: 45, sleep: 42, mental: 65, function: 58 },
    hasWarnings: false,
    wearable: { deviceType: 'Apple Watch', isConnected: true, lastSync: new Date().toISOString() },
    isProfileComplete: false,
    isQuestionnaireComplete: false,
    familyMembers: [],
    isVIP: false,
    coachSessionsRemaining: 1,
    referralCode: 'REHAB-888',
    voicePreference: 'default'
  });

  const handleUpdateProfile = (updates: Partial<PatientProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    if (updates.isProfileComplete && !newProfile.isQuestionnaireComplete && completeProfileMode === 'onboarding') {
      setShowQuestionnaire(true);
    }
    if (updates.isQuestionnaireComplete) {
      setShowQuestionnaire(false);
      setShowHealthRecord(true);
    }
  };

  const handleInviteFriend = () => {
    const text = `我在康养家管理肿瘤康复，使用我的邀请码 ${profile.referralCode} 即可免费注册并获得专家背书方案。下载链接：https://rehab.plus/download`;
    if (navigator.share) {
      navigator.share({ title: '康养家邀请', text }).catch(() => {});
    } else {
      alert("邀请文案已复制到剪贴板，快发给需要的朋友吧！\n\n" + text);
    }
  };

  const handleSubscribe = () => {
    setProfile(prev => ({ ...prev, isVIP: true, vipExpiry: '2026-05-24', coachSessionsRemaining: 99 }));
    setShowMembership(false);
    if (!profile.isQuestionnaireComplete) {
      setTimeout(() => {
        if (confirm("尊享会员开通成功！\n\n为了林主任专家团队能为您定制精准方案，建议立即完成康复评估。现在就开始吗？")) {
          setShowQuestionnaire(true);
        }
      }, 500);
    } else {
      alert("恭喜！您已成功开通五养尊享会员。即刻享受商城 7 折与专家团队优先服务。");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };
  
  if (loadingAuth) {
      return (
          <div className="min-h-screen max-w-md mx-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
      );
  }

  if (!user) {
    return <LoginView onLogin={() => setForceUpdate(c => c + 1)} />;
  }

  const renderContent = () => {
    if (showMembership) { return <MembershipCenter profile={profile} onBack={() => setShowMembership(false)} onSubscribe={handleSubscribe} />; }
    if (showCompleteProfile) { return <CompleteProfile profile={profile} onUpdate={handleUpdateProfile} onClose={() => setShowCompleteProfile(false)} mode={completeProfileMode} />; }
    if (showQuestionnaire) { return <HealthQuestionnaire profile={profile} onComplete={handleUpdateProfile} onSkip={() => setShowQuestionnaire(false)} />; }
    if (showHealthRecord) { return <HealthRecord profile={profile} onBack={() => setShowHealthRecord(false)} onUpdateProfile={handleUpdateProfile} />; }
    if (showSafetySettings) { return <SafetyWarningSettings profile={profile} onBack={() => setShowSafetySettings(false)} />; }
    if (protocolType) { return <ProtocolView onBack={() => setProtocolType(null)} initialTab={protocolType} />; }
    if (showSettings) { 
      return (
        <SettingsView 
          onBack={() => setShowSettings(false)} 
          onLogout={handleLogout} 
          onDeleteAccount={handleLogout} 
          isDeviceConnected={profile.wearable.isConnected}
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          fontSize={fontSize}
          setFontSize={setFontSize}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          language={language}
          setLanguage={setLanguage}
          hapticFeedback={hapticFeedback}
          setHapticFeedback={setHapticFeedback}
          unitSystem={unitSystem}
          setUnitSystem={setUnitSystem}
        />
      ); 
    }
    if (showCart) { return <CartView cart={cart} onBack={() => setShowCart(false)} onUpdateQuantity={(id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))} onRemove={(id) => setCart(prev => prev.filter(item => item.id !== id))} onToggleSelect={(id) => setCart(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item))} onSelectAll={(s) => setCart(prev => prev.map(item => ({ ...item, selected: s })))} onCheckout={() => setShowCart(false)} />; }
    if (showOrders) { return <OrdersLogistics onBack={() => setShowOrders(false)} onBuyAgain={(items) => { setCart([...items.map(i => ({...i, selected: true}))]); setShowCart(true); }} />; }
    if (showJournal) { return <RecoveryJournal logs={voiceLogs} onBack={() => setShowJournal(false)} />; }
    if (selectedNursing) { return <NursingDetail category={selectedNursing} currentScore={profile.scores[selectedNursing]} onBack={() => setSelectedNursing(null)} />; }
    if (showHumanCoach) { return <HumanCoachChat onBack={() => setShowHumanCoach(false)} profile={profile} onUpdateProfile={handleUpdateProfile} />; }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col">
            {!profile.isVIP && (
              <button 
                onClick={() => setShowMembership(true)}
                className="mx-5 mt-4 p-5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-[32px] text-white flex justify-between items-center shadow-lg shadow-amber-500/20 active:scale-95 transition-transform animate-in fade-in slide-in-from-top-2 duration-500"
              >
                <div className="flex items-center space-x-3">
                   <div className="p-2 bg-white/20 rounded-xl"><Crown size={18} /></div>
                   <div className="text-left">
                      <p className="text-xs font-black tracking-tight">加入五养尊享会员</p>
                      <p className="text-[10px] opacity-80">解锁 7 折养生包与专家关怀</p>
                   </div>
                </div>
                <ChevronRight size={16} />
              </button>
            )}
            <Home 
              profile={profile} 
              onUpdateProfile={handleUpdateProfile} 
              onSelectNursing={(n) => setSelectedNursing(n)} 
              updatedCategory={lastUpdatedCategory} 
              onStartReport={() => setShowReport(true)} 
              onStartAssessment={() => setShowQuestionnaire(true)}
            />
          </div>
        );
      case 'program': return <Program onStartVoice={() => setAssistantMode('logging')} recentLogs={voiceLogs} onViewJournal={() => setShowJournal(true)} />;
      case 'chat': return <AIChat profile={profile} onStartVoice={() => setAssistantMode('chat')} sessions={chatSessions} activeSessionId={activeSessionId} onSetActiveSession={setActiveSessionId} onSaveSession={(s) => setChatSessions(prev => [s, ...prev.filter(x => x.id !== s.id)])} onClearAllSessions={() => setChatSessions([])} onBack={() => setActiveTab(previousTab)} onStartAssessment={() => setShowQuestionnaire(true)} />;
      case 'mall': return <Marketplace profile={profile} cartCount={cart.length} onOpenCart={() => setShowCart(true)} onAddToCart={(sku, q) => setCart(prev => [...prev, {...sku, quantity: q, selected: true}])} />;
      case 'profile':
        return (
          <div className="p-6 space-y-10 pb-32">
            <div onClick={() => { setCompleteProfileMode('edit'); setShowCompleteProfile(true); }} className="bg-slate-800 dark:bg-slate-900 rounded-[40px] p-8 relative overflow-hidden border border-slate-700 dark:border-slate-800 shadow-2xl group active:scale-[0.98] transition-all cursor-pointer">
              <div className="relative z-10 flex items-center space-x-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/10 dark:bg-slate-800 rounded-3xl flex items-center justify-center border border-white/10 dark:border-slate-700 p-1.5 backdrop-blur-md overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" className="w-full h-full rounded-2xl bg-white" />
                  </div>
                  {profile.isVIP && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-500 rounded-full border-2 border-slate-800 flex items-center justify-center shadow-lg">
                      <Crown size={14} className="text-slate-900" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-2xl font-black text-white tracking-tight">{profile.name || '新用户'}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">{profile.cancerType}</span>
                    <span className="text-[10px] font-bold text-slate-400">· {profile.isVIP ? '尊享会员' : '普通用户'}</span>
                  </div>
                </div>
                <ChevronRight size={24} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowMembership(true)} className={`p-6 rounded-[32px] text-left transition-all active:scale-95 shadow-xl ${profile.isVIP ? 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800' : 'bg-amber-500 text-slate-950'}`}>
                <div className={`mb-3 p-3 w-fit rounded-2xl ${profile.isVIP ? 'bg-amber-100 text-amber-600' : 'bg-white/20'}`}>
                  <Crown size={22} />
                </div>
                <div className="text-sm font-black tracking-tight">{profile.isVIP ? '会员权益' : '开通会员'}</div>
                <div className="text-[9px] opacity-60 mt-1 font-bold uppercase tracking-widest">{profile.isVIP ? 'VIP ACTIVE' : 'Unlock Privileges'}</div>
              </button>
              <button onClick={handleInviteFriend} className="p-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-[32px] text-left active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-3 p-3 bg-white dark:bg-slate-700 w-fit rounded-2xl shadow-inner">
                  <Gift size={22} className="text-rose-500" />
                </div>
                <div className="text-sm font-black tracking-tight">邀请好友</div>
                <div className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-widest">Free Referral</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowHealthRecord(true)} className="p-6 bg-emerald-600 text-white rounded-[32px] shadow-xl shadow-emerald-500/20 text-left group active:scale-95 transition-all">
                <div className="mb-3 p-3 bg-white/20 w-fit rounded-2xl group-hover:scale-110 transition-transform"><FileText size={22} /></div>
                <div className="text-sm font-black tracking-tight">健康档案</div>
                <div className="text-[9px] opacity-70 mt-1 font-bold uppercase tracking-widest">Digital Record</div>
              </button>
              <button onClick={() => setShowHumanCoach(true)} className="p-6 bg-slate-800 dark:bg-slate-900 text-white rounded-[32px] shadow-xl border border-slate-700 text-left group active:scale-95 transition-all relative overflow-hidden">
                <div className="relative z-10">
                   <div className="mb-3 p-3 bg-blue-500 w-fit rounded-2xl group-hover:scale-110 transition-transform"><Headset size={22} /></div>
                   <div className="text-sm font-black tracking-tight leading-snug">人工教练</div>
                   <div className="text-[9px] text-blue-400/80 mt-1 font-bold uppercase tracking-widest">Human Coach</div>
                </div>
              </button>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-4 text-left">服务与管理</h4>
               <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button onClick={() => setShowQuestionnaire(true)} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 group active:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <ClipboardEdit size={18} className="text-slate-400" />
                       <span className="font-bold text-slate-700 dark:text-slate-300">康复评估</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </button>
                  <button onClick={() => setShowSafetySettings(true)} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 group active:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <ShieldCheck size={18} className="text-slate-400" />
                       <span className="font-bold text-slate-700 dark:text-slate-300">安全预警</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </button>
                  <button onClick={() => setShowOrders(true)} className="w-full p-6 flex justify-between items-center group active:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <ShoppingBag size={18} className="text-slate-400" />
                       <span className="font-bold text-slate-700 dark:text-slate-300">我的订单</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </button>
               </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-4 text-left">账号设置</h4>
               <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button onClick={() => setShowSettings(true)} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 group active:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <Settings size={18} className="text-slate-400" />
                       <span className="font-bold text-slate-700 dark:text-slate-300">系统设置</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </button>
                  <button onClick={() => setProtocolType('service')} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 group active:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <FileText size={18} className="text-slate-400" />
                       <span className="font-bold text-slate-700 dark:text-slate-300">服务协议</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </button>
                  <button onClick={() => setProtocolType('privacy')} className="w-full p-6 flex justify-between items-center group active:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <ShieldCheck size={18} className="text-slate-400" />
                       <span className="font-bold text-slate-700 dark:text-slate-300">隐私政策</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </button>
               </div>
            </div>
            
            <div className="pt-8 pb-10 text-center">
               <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">NURSING PLUS ONCOLOGY AI</p>
               <p className="text-[8px] text-slate-400 dark:text-slate-800 mt-1">Version 2.4.5</p>
            </div>
          </div>
        );
      default: return <Home profile={profile} onUpdateProfile={handleUpdateProfile} onSelectNursing={(n) => setSelectedNursing(n)} onStartReport={() => setShowReport(true)} onStartAssessment={() => setShowQuestionnaire(true)} />;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative bg-slate-50 dark:bg-slate-950 flex flex-col shadow-2xl border-x border-slate-200 dark:border-slate-800 transition-colors duration-300 no-scrollbar">
      {assistantMode && <LiveVoiceAssistant mode={assistantMode} onClose={() => setAssistantMode(null)} />}
      {showReport && <DailyHealthReport 
        profile={profile} 
        onClose={() => setShowReport(false)} 
        cache={reportCache} 
        onUpdateCache={setReportCache} 
      />}
      
      {!selectedNursing && !showJournal && !showOrders && !showCart && !showCompleteProfile && !showQuestionnaire && !showHealthRecord && !showSafetySettings && !protocolType && !showSettings && activeTab !== 'chat' && !showHumanCoach && !showMembership && (
        <header className="px-6 pt-6 pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 border-b border-transparent dark:border-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] leading-none">NURSING PLUS</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">{NAV_ITEMS.find(i => i.id === activeTab)?.label || '康养家'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setThemeMode(isDarkEffective ? 'light' : 'dark')} 
                className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm active:scale-90 transition-all"
              >
                {isDarkEffective ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>
              <button onClick={() => setAssistantMode('chat')} className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all shadow-emerald-500/20"><Mic size={20} /></button>
            </div>
          </div>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto no-scrollbar ${activeTab === 'chat' ? 'h-screen' : ''}`}>{renderContent()}</main>
      {!selectedNursing && !showJournal && !showOrders && !showCart && !showCompleteProfile && !showQuestionnaire && !showHealthRecord && !showSafetySettings && !protocolType && !showSettings && activeTab !== 'chat' && !showHumanCoach && !showMembership && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 flex justify-around items-center py-3.5 px-2 shadow-2xl z-50 rounded-[32px]">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => { setPreviousTab(activeTab); setActiveTab(item.id); }} className={`flex flex-col items-center justify-center min-w-[56px] transition-all duration-300 ${activeTab === item.id ? 'text-emerald-600 dark:text-emerald-400 transform scale-110' : 'text-slate-400'}`}>
              <div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>{item.icon}</div>
              <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-all duration-300 transform ${activeTab === item.id ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-75 h-0 overflow-hidden'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default App;

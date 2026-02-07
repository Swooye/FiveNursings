
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
import FavoritesView from './components/FavoritesView';
import ProductDetail from './components/ProductDetail';
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
  Loader2,
  Heart
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
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
  const [showFavorites, setShowFavorites] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<SKU | null>(null);
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

  const [favorites, setFavorites] = useState<SKU[]>(() => {
    const saved = localStorage.getItem('user_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('user_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (sku: SKU) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === sku.id);
      if (exists) return prev.filter(f => f.id !== sku.id);
      return [...prev, sku];
    });
  };

  useEffect(() => {
    if (dbUser) {
      setProfile(prev => ({
        ...prev,
        name: dbUser.name || prev.name,
        nickname: dbUser.nickname || prev.nickname,
        gender: dbUser.gender || prev.gender,
        birthDate: dbUser.birthDate || prev.birthDate,
        height: dbUser.height || prev.height,
        weight: dbUser.weight || prev.weight,
      }));
    }
  }, [dbUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const res = await fetch(`/api/users`);
          if (res.ok) {
            const users = await res.json();
            let found = users.find((u: any) => u.firebaseUid === currentUser.uid);
            if (found) setDbUser(found);
          }
        } catch (err) { console.error(err); }
      }
      setLoadingAuth(false);
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
    } else { applyTheme(themeMode === 'dark'); }
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const handleUpdateProfile = async (updates: Partial<PatientProfile>) => {
    const targetId = dbUser?._id;
    if (targetId) {
      try {
        const response = await fetch(`/api/user/${targetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updates.name,
            nickname: updates.nickname,
            gender: updates.gender,
            birthDate: updates.birthDate,
            height: updates.height,
            weight: updates.weight,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`
          })
        });
        if (response.ok) {
          const updatedUserData = await response.json();
          setDbUser(updatedUserData.user);
          setShowCompleteProfile(false);
        }
      } catch (error) { console.error("Failed to update profile:", error); }
    }
    setProfile(prev => ({ ...prev, ...updates }));
    if (updates.isProfileComplete && !profile.isQuestionnaireComplete && completeProfileMode === 'onboarding') setShowQuestionnaire(true);
    if (updates.isQuestionnaireComplete) { setShowQuestionnaire(false); setShowHealthRecord(true); }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setDbUser(null);
    setShowSettings(false);
  };
  
  if (loadingAuth) {
    return <div className="min-h-screen max-w-md mx-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
  }

  if (!user) return <LoginView onLogin={() => setForceUpdate(c => c + 1)} />;

  const renderContent = () => {
    if (showMembership) return <MembershipCenter profile={profile} onBack={() => setShowMembership(false)} onSubscribe={() => {}} />;
    if (showCompleteProfile) return <CompleteProfile profile={profile} onUpdate={handleUpdateProfile} onClose={() => setShowCompleteProfile(false)} mode={completeProfileMode} />;
    if (showQuestionnaire) return <HealthQuestionnaire profile={profile} onComplete={handleUpdateProfile} onSkip={() => setShowQuestionnaire(false)} />;
    if (showHealthRecord) return <HealthRecord profile={profile} onBack={() => setShowHealthRecord(false)} onUpdateProfile={handleUpdateProfile} />;
    if (showSafetySettings) return <SafetyWarningSettings profile={profile} onBack={() => setShowSafetySettings(false)} />;
    if (showFavorites) return <FavoritesView favorites={favorites} onBack={() => setShowFavorites(false)} onRemoveFavorite={(id) => setFavorites(f => f.filter(x => x.id !== id))} onSelectProduct={(sku) => { setViewingProduct(sku); setShowFavorites(false); }} />;
    if (viewingProduct) return <ProductDetail sku={viewingProduct} profile={profile} isFavorited={favorites.some(f => f.id === viewingProduct.id)} onToggleFavorite={toggleFavorite} onBack={() => setViewingProduct(null)} onPurchase={() => {}} onAddToCart={(sku, q) => setCart(prev => [...prev, {...sku, quantity: q, selected: true}])} />;
    if (protocolType) return <ProtocolView onBack={() => setProtocolType(null)} initialTab={protocolType} />;
    if (showSettings) return <SettingsView onBack={() => setShowSettings(false)} onLogout={handleLogout} onDeleteAccount={handleLogout} isDeviceConnected={profile.wearable.isConnected} profile={profile} onUpdateProfile={handleUpdateProfile} fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} hapticFeedback={hapticFeedback} setHapticFeedback={setHapticFeedback} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />;
    if (showCart) return <CartView cart={cart} onBack={() => setShowCart(false)} onUpdateQuantity={() => {}} onRemove={() => {}} onToggleSelect={() => {}} onSelectAll={() => {}} onCheckout={() => {}} />;
    if (showOrders) return <OrdersLogistics onBack={() => setShowOrders(false)} onBuyAgain={() => {}} />;
    if (showJournal) return <RecoveryJournal logs={voiceLogs} onBack={() => setShowJournal(false)} />;
    if (selectedNursing) return <NursingDetail category={selectedNursing} currentScore={profile.scores[selectedNursing]} onBack={() => setSelectedNursing(null)} />;
    if (showHumanCoach) return <HumanCoachChat onBack={() => setShowHumanCoach(false)} profile={profile} onUpdateProfile={handleUpdateProfile} />;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col text-left">
            <Home profile={profile} onUpdateProfile={handleUpdateProfile} onSelectNursing={(n) => setSelectedNursing(n)} updatedCategory={lastUpdatedCategory} onStartReport={() => setShowReport(true)} onStartAssessment={() => setShowQuestionnaire(true)} />
          </div>
        );
      case 'program': return <Program onStartVoice={() => setAssistantMode('logging')} recentLogs={voiceLogs} onViewJournal={() => setShowJournal(true)} />;
      case 'chat': return <AIChat profile={profile} onStartVoice={() => setAssistantMode('chat')} sessions={chatSessions} activeSessionId={activeSessionId} onSetActiveSession={setActiveSessionId} onSaveSession={(s) => setChatSessions(prev => [s, ...prev.filter(x => x.id !== s.id)])} onClearAllSessions={() => setChatSessions([])} onBack={() => {}} onStartAssessment={() => {}} />;
      case 'mall': return <Marketplace profile={profile} cartCount={cart.length} favorites={favorites} onToggleFavorite={toggleFavorite} onOpenCart={() => setShowCart(true)} onAddToCart={(sku, q) => setCart(prev => [...prev, {...sku, quantity: q, selected: true}])} />;
      case 'profile':
        return (
          <div className="p-6 space-y-10 pb-32 overflow-y-auto no-scrollbar">
            <div onClick={() => { setCompleteProfileMode('edit'); setShowCompleteProfile(true); }} className="bg-slate-800 dark:bg-slate-900 rounded-[40px] p-8 relative overflow-hidden border border-slate-700 dark:border-slate-800 shadow-2xl group active:scale-[0.98] transition-all cursor-pointer text-left">
              <div className="relative z-10 flex items-center space-x-6">
                <div className="w-20 h-20 bg-white/10 dark:bg-slate-800 rounded-3xl flex items-center justify-center border border-white/10 dark:border-slate-700 p-1.5 backdrop-blur-md overflow-hidden">
                  <img src={dbUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" className="w-full h-full rounded-2xl bg-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white tracking-tight">{profile.nickname || profile.name || '新用户'}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">{profile.cancerType}</span>
                    <span className="text-[10px] font-bold text-slate-400">· {profile.isVIP ? '尊享会员' : '普通用户'}</span>
                  </div>
                </div>
                <ChevronRight size={24} className="text-slate-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              <button onClick={() => setShowMembership(true)} className={`p-6 rounded-[32px] text-left transition-all active:scale-95 shadow-xl ${profile.isVIP ? 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800' : 'bg-amber-500 text-slate-950'}`}>
                <div className={`mb-3 p-3 w-fit rounded-2xl ${profile.isVIP ? 'bg-amber-100 text-amber-600' : 'bg-white/20'}`}><Crown size={22} /></div>
                <div className="text-sm font-black tracking-tight">{profile.isVIP ? '会员权益' : '开通会员'}</div>
              </button>
              <button onClick={() => setShowHealthRecord(true)} className="p-6 bg-emerald-600 text-white rounded-[32px] shadow-xl text-left active:scale-95 transition-all">
                <div className="mb-3 p-3 bg-white/20 w-fit rounded-2xl"><FileText size={22} /></div>
                <div className="text-sm font-black tracking-tight">健康档案</div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
               <button onClick={() => setShowHumanCoach(true)} className="p-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-[32px] text-left active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-3 p-3 bg-white dark:bg-slate-700 w-fit rounded-2xl shadow-inner"><Headset size={22} className="text-blue-500" /></div>
                <div className="text-sm font-black tracking-tight">人工教练</div>
              </button>
              <button onClick={() => {}} className="p-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 rounded-[32px] text-left active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-3 p-3 bg-white dark:bg-slate-700 w-fit rounded-2xl shadow-inner"><Gift size={22} className="text-rose-500" /></div>
                <div className="text-sm font-black tracking-tight">邀请好友</div>
              </button>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-4 text-left">服务与管理</h4>
               <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button onClick={() => setShowQuestionnaire(true)} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 active:bg-slate-50/50 transition-colors"><div className="flex items-center space-x-3"><ClipboardEdit size={18} className="text-slate-400" /><span className="font-bold text-slate-700 dark:text-slate-300">康复评估</span></div><ChevronRight size={16} className="text-slate-200" /></button>
                  <button onClick={() => setShowOrders(true)} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 active:bg-slate-50/50 transition-colors"><div className="flex items-center space-x-3"><ShoppingBag size={18} className="text-slate-400" /><span className="font-bold text-slate-700 dark:text-slate-300">我的订单</span></div><ChevronRight size={16} className="text-slate-200" /></button>
                  <button onClick={() => setShowFavorites(true)} className="w-full p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 active:bg-slate-50/50 transition-colors"><div className="flex items-center space-x-3"><Heart size={18} className="text-slate-400" /><span className="font-bold text-slate-700 dark:text-slate-300">我的收藏</span></div><ChevronRight size={16} className="text-slate-200" /></button>
                  <button onClick={() => setShowSafetySettings(true)} className="w-full p-6 flex justify-between items-center group active:bg-slate-50/50 transition-colors"><div className="flex items-center space-x-3"><ShieldCheck size={18} className="text-slate-400" /><span className="font-bold text-slate-700 dark:text-slate-300">安全预警</span></div><ChevronRight size={16} className="text-slate-200" /></button>
               </div>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-4 text-left">系统</h4>
               <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  <button onClick={() => setShowSettings(true)} className="w-full p-6 flex justify-between items-center active:bg-slate-50/50 transition-colors"><div className="flex items-center space-x-3"><Settings size={18} className="text-slate-400" /><span className="font-bold text-slate-700 dark:text-slate-300">系统设置</span></div><ChevronRight size={16} className="text-slate-200" /></button>
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
      {showReport && <DailyHealthReport profile={profile} onClose={() => setShowReport(false)} cache={reportCache} onUpdateCache={setReportCache} />}
      {!selectedNursing && !showJournal && !showOrders && !showCart && !showCompleteProfile && !showQuestionnaire && !showHealthRecord && !showSafetySettings && !protocolType && !showSettings && activeTab !== 'chat' && !showHumanCoach && !showMembership && !showFavorites && !viewingProduct && (
        <header className="px-6 pt-6 pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 border-b border-transparent dark:border-slate-900">
          <div className="flex items-center justify-between"><div className="flex flex-col text-left"><span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] leading-none">NURSING PLUS</span><span className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">{NAV_ITEMS.find(i => i.id === activeTab)?.label || '康养家'}</span></div><div className="flex items-center space-x-3"><button onClick={() => setThemeMode(isDarkEffective ? 'light' : 'dark')} className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm active:scale-90 transition-all">{isDarkEffective ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}</button><button onClick={() => setAssistantMode('chat')} className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all shadow-emerald-500/20"><Mic size={20} /></button></div></div>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto no-scrollbar ${activeTab === 'chat' ? 'h-screen' : ''}`}>{renderContent()}</main>
      {!selectedNursing && !showJournal && !showOrders && !showCart && !showCompleteProfile && !showQuestionnaire && !showHealthRecord && !showSafetySettings && !protocolType && !showSettings && activeTab !== 'chat' && !showHumanCoach && !showMembership && !showFavorites && !viewingProduct && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 flex justify-around items-center py-3.5 px-2 shadow-2xl z-50 rounded-[32px]">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => { setPreviousTab(activeTab); setActiveTab(item.id); }} className={`flex flex-col items-center justify-center min-w-[56px] transition-all duration-300 ${activeTab === item.id ? 'text-emerald-600 dark:text-emerald-400 transform scale-110' : 'text-slate-400'}`}><div className={`p-1.5 rounded-xl ${activeTab === item.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>{item.icon}</div><span className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-all duration-300 transform ${activeTab === item.id ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-75 h-0 overflow-hidden'}`}>{item.label}</span></button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default App;

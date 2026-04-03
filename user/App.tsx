
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/firebase';
import { PatientProfile, CancerType, TreatmentStage, NursingScores, VoiceLog, CartItem, SKU, ChatSession, DailyTask } from './types';
import Home from './components/Home';
import Program from './components/Program';
import AIChat from './components/AIChat';
import Marketplace from './components/Marketplace';
import PlanCustomizer from './components/PlanCustomizer';
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
import DiaryChat from './components/DiaryChat';
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

// 动态识别环境
const API_URL = import.meta.env.DEV ? "" : "https://api-u46fik5vcq-uc.a.run.app";

const toLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [_, setForceUpdate] = useState(0);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(toLocalDateString());
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [initialCoachMessage, setInitialCoachMessage] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<'chat' | 'logging' | null>(null);
  const [assistantSessionId, setAssistantSessionId] = useState<string | null>(null);
  const [showPlanCustomizer, setShowPlanCustomizer] = useState(false);
  const [lastVoiceSessionId, setLastVoiceSessionId] = useState<string | null>(null);
  const [chatRefreshTrigger, setChatRefreshTrigger] = useState(0);
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
  const [showDiaryChat, setShowDiaryChat] = useState(false);
  const [completeProfileMode, setCompleteProfileMode] = useState<'onboarding' | 'edit'>('onboarding');
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [lastUpdatedCategory, setLastUpdatedCategory] = useState<keyof NursingScores | null>(null);
  const [reportCache, setReportCache] = useState<{ date: string; profileJSON: string; text: string } | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  const voiceSessionIdRef = useRef<string | null>(null);

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => (localStorage.getItem('themeMode') as any) || 'system');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large' | 'extra-large'>(() => (localStorage.getItem('font-size') as any) || 'normal');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'zh');
  const [hapticFeedback, setHapticFeedback] = useState(() => localStorage.getItem('haptics') !== 'false');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>(() => (localStorage.getItem('units') as any) || 'metric');

  const [isDarkEffective, setIsDarkEffective] = useState(false);

  const [profile, setProfile] = useState<PatientProfile>({
    id: '', name: '', nickname: '', age: 0,
    cancerType: CancerType.OTHER, stage: TreatmentStage.UNTREATED,
    scores: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 80, environment: 85 },
    baselines: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 80, environment: 85 },
    hasWarnings: false, wearable: { deviceType: 'None', isConnected: false, lastSync: null, steps: 0, sleepHours: 0 },
    isProfileComplete: false, isQuestionnaireComplete: false,
    familyMembers: [], isVIP: false, coachSessionsRemaining: 0, referralCode: '', voicePreference: 'default',
    todaySymptoms: [], lastSymptomUpdate: new Date().toISOString()
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
      const todayStr = toLocalDateString();
      const lastUpdateStr = dbUser.lastSymptomUpdate ? toLocalDateString(new Date(dbUser.lastSymptomUpdate)) : '';
      
      let todaySymptoms = dbUser.todaySymptoms || [];
      if (lastUpdateStr && lastUpdateStr !== todayStr) {
        todaySymptoms = [];
      }

      // 核心优化：合并分值，如果数据库为0则保留基准分
      const mergedScores = { ...prevProfileRef.current.scores };
      if (dbUser.scores) {
        Object.keys(dbUser.scores).forEach(key => {
          const k = key as keyof NursingScores;
          if (dbUser.scores[k] > 0) {
            mergedScores[k] = dbUser.scores[k];
          }
        });
      }

      setProfile(prev => ({
        ...prev,
        ...dbUser,
        id: dbUser.id || dbUser._id || prev.id,
        name: dbUser.name || '',
        nickname: dbUser.nickname || '',
        scores: mergedScores,
        isProfileComplete: !!dbUser.isProfileComplete,
        isQuestionnaireComplete: !!dbUser.isQuestionnaireComplete,
        isVIP: !!dbUser.isVIP,
        todaySymptoms: todaySymptoms,
        lastSymptomUpdate: dbUser.lastSymptomUpdate || prev.lastSymptomUpdate,
        coreRecoveryIndex: dbUser.coreRecoveryIndex || prev.coreRecoveryIndex,
        questionnaire: dbUser.questionnaire || prev.questionnaire,
        tcmAnalysisResult: dbUser.tcmAnalysisResult || prev.tcmAnalysisResult
      }));
    }
  }, [dbUser]);

  const prevProfileRef = useRef(profile);
  useEffect(() => {
    prevProfileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // --- 核心优化：一旦登录成功，静默同步地理位置供 OpenClaw 教练参考 ---
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              await fetch(`${API_URL}/api/users/${currentUser.uid}/location`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ lat: latitude, lng: longitude, silent: true })
              });
            } catch (e) {}
          }, undefined, { timeout: 10000 });
        }

        try {
          const res = await fetch(`${API_URL}/api/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseUid: currentUser.uid,
              email: currentUser.email,
              phoneNumber: currentUser.phoneNumber
            })
          });
          if (res.ok) {
            const userData = await res.json();
            setDbUser(userData);
          }
        } catch (err) { console.error("Login sync error:", err); }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 轮询检查未读消息 ---
  const checkUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/messages/unread-count/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (e) { console.error("Failed to check unread:", e); }
  }, [user]);

  const fetchVoiceLogs = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/voice_logs?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setVoiceLogs(data);
      }
    } catch (e) { console.error("Failed to fetch voice logs:", e); }
  }, []);

  const fetchDailyTasks = useCallback(async (userId: string, dateStr?: string) => {
    try {
      const targetDate = dateStr || selectedDate;
      const res = await fetch(`${API_URL}/api/daily_tasks?userId=${userId}&date=${targetDate}`);
      if (res.ok) {
        const data = await res.json();
        setDailyTasks(data);
      }
    } catch (e) { console.error("Failed to fetch tasks:", e); }
  }, []);

  const triggerTaskGeneration = useCallback(async (userId: string, profile: PatientProfile, dateStr?: string) => {
    try {
      const targetDate = dateStr || selectedDate;
      const res = await fetch(`${API_URL}/api/daily_tasks/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, profile, date: targetDate })
      });
      if (res.ok) {
          const data = await res.json();
          setDailyTasks(data);
          return data;
      }
    } catch (e) { console.error("Failed to trigger task generation:", e); }
  }, []);

  useEffect(() => {
    checkUnread();
    if (profile.id) {
        fetchVoiceLogs(profile.id);
        fetchDailyTasks(profile.id, selectedDate);
    }
    const timer = setInterval(checkUnread, 30000); 
    return () => clearInterval(timer);
  }, [checkUnread, profile.id, fetchVoiceLogs, fetchDailyTasks]);

  // 已读权交给 AIChat 组件处理，此处移除自动标记逻辑

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (isDark: boolean) => {
      setIsDarkEffective(isDark);
      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };
    if (themeMode === 'system') {
      applyTheme(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else { applyTheme(themeMode === 'dark'); }
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

  const handleUpdateProfile = async (updates: Partial<PatientProfile>) => {
    const targetId = dbUser?._id || dbUser?.id;
    console.log(`[App] Updating profile for user ${targetId}...`, updates);
    
    // Immediate state updates for UI responsiveness
    if (updates.isQuestionnaireComplete) {
      console.log("[App] Questionnaire complete, transitioning UI...");
      setShowQuestionnaire(false);
      setShowHealthRecord(true);
    }
    if (updates.isProfileComplete && !profile.isQuestionnaireComplete && completeProfileMode === 'onboarding') {
      setShowQuestionnaire(true);
    }

    if (targetId) {
      try {
        const response = await fetch(`${API_URL}/api/users/${targetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updates,
            isProfileComplete: updates.isProfileComplete ?? true 
          })
        });
        
        if (response.ok) {
          const updatedUserData = await response.json();
          setDbUser(updatedUserData.user || updatedUserData);
          setShowCompleteProfile(false);
          console.log(`[App] Profile update successfully persisted. fields: ${Object.keys(updates).join(', ')}`);
        } else {
          console.error(`[App] Backend error ${response.status} when updating profile.`, await response.text());
        }
      } catch (error) { console.error("[App] Network failed to update profile:", error); }
    }
    setProfile(prev => {
      const newProfile = { ...prev, ...updates };
      if (updates.isQuestionnaireComplete) {
        console.log("[App] Questionnaire complete, triggering task generation...");
        triggerTaskGeneration(prev.id, newProfile);
      }
      return newProfile;
    });
  };

  const handleLogout = async () => {
    await auth.signOut();
    setDbUser(null);
    setProfile({
      id: '', name: '', nickname: '', age: 0,
      cancerType: CancerType.OTHER, stage: TreatmentStage.UNTREATED,
      scores: { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 80, environment: 85 },
      hasWarnings: false, wearable: { deviceType: 'None', isConnected: false, lastSync: null, steps: 0, sleepHours: 0 },
      isProfileComplete: false, isQuestionnaireComplete: false,
      familyMembers: [], isVIP: false, coachSessionsRemaining: 0, referralCode: '', voicePreference: 'default'
    });
    setShowSettings(false);
    setChatRefreshTrigger(prev => prev + 1);
    setActiveTab('dashboard');
  };

  // When voice mode starts, generate a sessionId if needed
  useEffect(() => {
    if (assistantMode) {
      voiceSessionIdRef.current = assistantSessionId || `voice_${Date.now()}`;
      if (!assistantSessionId) {
        setAssistantSessionId(voiceSessionIdRef.current);
      }
    } else {
      voiceSessionIdRef.current = null;
    }
  }, [assistantMode, assistantSessionId]);

  const handleVoiceMessageGenerated = async (msg: { role: 'user' | 'model'; text: string }) => {
    if (!user) return;
    const sid = voiceSessionIdRef.current || assistantSessionId || `voice_${Date.now()}`;
    try {
        await fetch(`${API_URL}/api/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.uid,
                role: msg.role,
                text: msg.text,
                sessionId: sid,
                sessionTitle: '语音通话记录',
                type: 'chat'
            })
        });
    } catch (e) {
        console.error("Failed to persist voice message:", e);
    }
  };

  const handleDiaryComplete = async (summary: string, impact: any) => {
    try {
        const res = await fetch(`${API_URL}/api/voice_logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: profile.id,
                summary,
                impact,
                timestamp: new Date().toISOString()
            })
        });
        if (res.ok) {
            const savedLog = await res.json();
            setVoiceLogs(prev => [savedLog, ...prev]);
        }
    } catch (e) { console.error("Failed to save diary log:", e); }
    
    setShowDiaryChat(false);
  };
  
  const handleToggleTask = async (taskId: string) => {
    const task = dailyTasks.find(t => (t as any).id === taskId || (t as any)._id === taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    setDailyTasks(prev => prev.map(t => ((t as any).id === taskId || (t as any)._id === taskId) ? { ...t, completed: newCompleted } : t));
    
    try {
        await fetch(`${API_URL}/api/daily_tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: newCompleted })
        });
    } catch (e) { console.error("Failed to toggle task:", e); }
  };
  const handleUpdateTask = async (taskId: string, updates: Partial<DailyTask>) => {
    setDailyTasks(prev => prev.map(t => ((t as any).id === taskId || (t as any)._id === taskId) ? { ...t, ...updates } : t));
    try {
        await fetch(`${API_URL}/api/daily_tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
    } catch (e) { console.error("Failed to update task:", e); }
  };

  const handleGeneratePlan = async () => {
    if (!profile.id) return;
    try {
        const res = await fetch(`${API_URL}/api/daily_tasks/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id, profile, date: selectedDate, commit: true })
        });
        if (res.ok) {
            fetchDailyTasks(profile.id, selectedDate);
        }
    } catch (e) { console.error("Failed to generate plan:", e); }
  };

  const handlePlanAction = async (action: any) => {
    if (!profile.id) return;
    try {
        const today = new Date().toISOString().split('T')[0];
        if (action.type === 'ADD_TASK') {
            const newTask = {
                userId: profile.id,
                ...action.task,
                date: selectedDate,
                completed: false,
                isManual: true,
                source: 'AI_COACH'
            };
            const res = await fetch(`${API_URL}/api/daily_tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            if (res.ok) {
                fetchDailyTasks(profile.id, selectedDate);
                setChatRefreshTrigger(prev => prev + 1);
            }
        }
    } catch (e) { console.error("Plan action failed:", e); }
  };

  const handleCalculateIndex = async () => {
    if (!profile.id) return;
    try {
        console.log(`[App] Triggering calculation for profile ID: ${profile.id}`);
        const res = await fetch(`${API_URL}/api/users/${profile.id}/calculate-index`, {
            method: 'POST'
        });
        console.log(`[App] Calculation response status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log("[App] Calculation result:", data);
            setProfile(prev => ({ 
              ...prev, 
              scores: data.scores, 
              coreRecoveryIndex: data.cri,
              baselines: data.baselines || prev.baselines
            }));
            return data;
        }
    } catch (e) { console.error("[App] Index calculation failed:", e); }
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
    if (showSettings) return <SettingsView onBack={() => setShowSettings(false)} onLogout={handleLogout} onDeleteAccount={handleLogout} profile={profile} onUpdateProfile={handleUpdateProfile} fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} language={language} setLanguage={setLanguage} hapticFeedback={hapticFeedback} setHapticFeedback={setHapticFeedback} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />;
    if (showCart) return <CartView cart={cart} onBack={() => setShowCart(false)} onUpdateQuantity={() => {}} onRemove={() => {}} onToggleSelect={() => {}} onSelectAll={() => {}} onCheckout={() => {}} />;
    if (showOrders) return <OrdersLogistics onBack={() => setShowOrders(false)} onBuyAgain={() => {}} />;
    if (showJournal) return <RecoveryJournal logs={voiceLogs} onBack={() => setShowJournal(false)} />;
    if (selectedNursing) return (
      <NursingDetail 
        category={selectedNursing} 
        profile={profile} 
        tasks={dailyTasks} 
        currentScore={profile.scores[selectedNursing]} 
        onBack={() => setSelectedNursing(null)} 
        onAskCoach={(msg) => {
          setInitialCoachMessage(msg);
          setActiveTab('chat');
          setSelectedNursing(null);
        }}
      />
    );
    if (showHumanCoach) return <HumanCoachChat onBack={() => setShowHumanCoach(false)} profile={profile} onUpdateProfile={handleUpdateProfile} />;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex flex-col text-left">
            <Home profile={profile} tasks={dailyTasks} unreadCount={unreadCount} onUpdateProfile={handleUpdateProfile} onSelectNursing={(n) => setSelectedNursing(n)} updatedCategory={lastUpdatedCategory} onStartReport={() => setShowReport(true)} onStartAssessment={() => setShowQuestionnaire(true)} onCalculateIndex={handleCalculateIndex} isDark={isDarkEffective} />
          </div>
        );
      case 'program': return (
        <Program 
          profile={profile} 
          tasks={dailyTasks}
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            if (profile.id) fetchDailyTasks(profile.id, d);
          }}
          onToggleTask={handleToggleTask}
          onUpdateTask={handleUpdateTask}
          onGeneratePlan={() => setShowPlanCustomizer(true)}
          onUpdateProfile={handleUpdateProfile} 
          onStartVoice={() => setAssistantMode('logging')} 
          recentLogs={voiceLogs} 
          onViewJournal={() => setShowJournal(true)} 
          onAddDiary={() => setShowDiaryChat(true)}
          isDark={isDarkEffective} 
        />
      );
      case 'chat': return <AIChat profile={profile} onStartVoice={(sid) => { setAssistantSessionId(sid || null); setAssistantMode('chat'); }} onBack={() => { setAssistantMode(null); setPreviousTab('dashboard'); setActiveTab('dashboard'); }} onStartAssessment={() => setShowQuestionnaire(true)} onReadMessages={() => setUnreadCount(0)} isDark={isDarkEffective} refreshTrigger={chatRefreshTrigger} voiceSessionId={lastVoiceSessionId} initialPrompt={initialCoachMessage} onClearInitialPrompt={() => setInitialCoachMessage(null)} onPlanAction={handlePlanAction} />;
      case 'mall': return <Marketplace profile={profile} cartCount={cart.length} favorites={favorites} onToggleFavorite={toggleFavorite} onOpenCart={() => setShowCart(true)} onAddToCart={(sku, q) => setCart(prev => [...prev, {...sku, quantity: q, selected: true}])} isDark={isDarkEffective} />;
      case 'profile':
        return (
          <div className="p-6 space-y-10 pb-32 overflow-y-auto no-scrollbar">
            <div onClick={() => { setCompleteProfileMode('edit'); setShowCompleteProfile(true); }} className="bg-slate-800 dark:bg-slate-900 rounded-[40px] p-8 relative overflow-hidden border border-slate-700 dark:border-slate-800 shadow-2xl group active:scale-[0.98] transition-all cursor-pointer text-left">
              <div className="relative z-10 flex items-center space-x-6">
                <div className="w-20 h-20 bg-white/10 dark:bg-slate-800 rounded-3xl flex items-center justify-center border border-white/10 dark:border-slate-700 p-1.5 backdrop-blur-md overflow-hidden">
                  <img src={dbUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Avatar" className="w-full h-full rounded-2xl bg-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-white tracking-tight">{profile.nickname || '新用户'}</h3>
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
      default: return <Home profile={profile} tasks={dailyTasks} unreadCount={unreadCount} onUpdateProfile={handleUpdateProfile} onSelectNursing={(n) => setSelectedNursing(n)} onStartReport={() => setShowReport(true)} onStartAssessment={() => setShowQuestionnaire(true)} onCalculateIndex={handleCalculateIndex} isDark={isDarkEffective} />;
    }
  };



  return (
    <div className={`min-h-screen max-w-md mx-auto relative flex flex-col shadow-2xl border-x border-slate-200 dark:border-slate-800/50 transition-colors duration-500 no-scrollbar overflow-hidden ${isDarkEffective ? 'bg-[#050912]' : 'bg-[#f8fafc]'}`}>
      {/* Safe Area Top Spacer */}
      <div className="h-[var(--safe-area-top)] bg-slate-50/80 dark:bg-[#050912]/80 backdrop-blur-md sticky top-0 z-50"></div>
      {assistantMode && (
        <LiveVoiceAssistant 
            profile={profile} 
            sessionId={assistantSessionId}
            onClose={() => { 
              setLastVoiceSessionId(voiceSessionIdRef.current || assistantSessionId);
              setAssistantMode(null); 
              setChatRefreshTrigger(prev => prev + 1); 
            }} 
            onConfirmLog={() => {}} 
            onMessageGenerated={handleVoiceMessageGenerated}
        />
      )}
      {showReport && <DailyHealthReport profile={profile} onClose={() => setShowReport(false)} cache={reportCache} onUpdateCache={setReportCache} />}
      {!selectedNursing && !showJournal && !showOrders && !showCart && !showCompleteProfile && !showQuestionnaire && !showHealthRecord && !showSafetySettings && !protocolType && !showSettings && activeTab !== 'chat' && !showHumanCoach && !showMembership && !showFavorites && !viewingProduct && (
        <header className="px-6 pt-2 pb-4 bg-slate-50/80 dark:bg-[#050912]/80 backdrop-blur-md sticky top-0 z-40 border-b border-transparent dark:border-white/5">
          <div className="flex items-center justify-between font-outfit">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1">康养家</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{NAV_ITEMS.find(i => i.id === activeTab)?.label || '首页'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={() => setThemeMode(isDarkEffective ? 'light' : 'dark')} className="w-11 h-11 rounded-2xl bg-white dark:bg-[#111827] text-slate-400 flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-sm active:scale-90 transition-all">
                {isDarkEffective ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>
              <button onClick={() => { setAssistantSessionId(null); setAssistantMode('chat'); }} className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-90 transition-all">
                <Mic size={20} />
              </button>
            </div>
          </div>
        </header>
      )}
      <main key={activeTab} className={`flex-1 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300 ${activeTab === 'chat' ? 'h-full' : ''}`}>{renderContent()}</main>
      {!selectedNursing && !showJournal && !showOrders && !showCart && !showCompleteProfile && !showQuestionnaire && !showHealthRecord && !showSafetySettings && !protocolType && !showSettings && activeTab !== 'chat' && !showHumanCoach && !showMembership && !showFavorites && !viewingProduct && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-3xl border border-slate-100 dark:border-white/10 flex justify-around items-center py-4 px-2 shadow-[0_25px_60px_rgba(0,0,0,0.4)] z-50 rounded-[40px] mb-[var(--safe-area-bottom)] transition-all duration-700">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => { 
                setPreviousTab(activeTab); 
                setActiveTab(item.id); 
                if (item.id === 'chat') setUnreadCount(0);
              }} className={`flex flex-col items-center justify-center min-w-[64px] transition-all duration-500 relative btn-active-scale ${activeTab === item.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-emerald-50 dark:bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : ''}`}>
                {item.icon}
                {item.id === 'chat' && unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 min-w-[18px] px-1 h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B0F1A] animate-bounce shadow-sm">
                     {unreadCount > 99 ? '99+' : unreadCount}
                   </span>
                )}
              </div>
              <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider transition-all duration-300 transform ${activeTab === item.id ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-75 h-0 overflow-hidden'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="h-[var(--safe-area-bottom)] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl"></div>
      {showDiaryChat && (
        <DiaryChat 
          profile={profile} 
          onBack={() => setShowDiaryChat(false)} 
          onComplete={handleDiaryComplete} 
          isDark={isDarkEffective} 
        />
      )}
      {showPlanCustomizer && (
        <PlanCustomizer 
          profile={profile}
          existingTasks={dailyTasks}
          selectedDate={selectedDate}
          onBack={() => setShowPlanCustomizer(false)}
          onConfirm={() => {
            setShowPlanCustomizer(false);
            fetchDailyTasks(profile.id, selectedDate);
          }}
          isDark={isDarkEffective}
        />
      )}
    </div>
  );
};

export default App;

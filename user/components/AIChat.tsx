
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { PatientProfile, ChatMessage } from '../types';
import { Send, Mic, X, Calendar, MessageSquare, ArrowLeft, PhoneCall, AlertTriangle, ChevronRight, Square, Sparkles, Loader2, History, StopCircle, Plus, Image as ImageIcon, Camera, MicVocal, MapPin, Keyboard, Trash2, Video, Target, AudioLines } from 'lucide-react';
import { auth, functions } from '../src/firebase';
import { ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar } from 'recharts';

const API_URL = import.meta.env.DEV ? "" : "https://us-central1-fivenursings-73917017-a0dfd.cloudfunctions.net/api";

const ChartRenderer: React.FC<{ chartData: any }> = ({ chartData }) => {
  const { type, data, xAxisKey, grid, tooltip, lines, bars } = chartData;
  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        {type === 'line' ? (
          <LineChart data={data}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />}
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            {tooltip && <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                borderColor: '#334155',
                borderRadius: '12px'
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />}
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {lines?.map((line: any, index: number) => <Line key={index} type={line.type} dataKey={line.dataKey} stroke={line.stroke} strokeWidth={2} />)}
          </LineChart>
        ) : (
          <BarChart data={data}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />}
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            {tooltip && <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.8)',
                borderColor: '#334155',
                borderRadius: '12px'
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />}
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {bars?.map((bar: any, index: number) => <Bar key={index} dataKey={bar.dataKey} fill={bar.fill} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

const WELCOME_TEXT = (name: string) => `您好，**${name || '用户'}**。我是您的五养 AI 康复教练“五养教练”。\n\n您可以向我咨询任何关于“五养”康复（饮食、运动、睡眠、心态、机能）的问题，我将根据您的个人健康档案提供个性化建议。`;

const MarkdownContent: React.FC<{ content: string, onPlanAction?: (action: any) => void }> = ({ content, onPlanAction }) => {
  const parts = content.split(/(\[CHART\].*?\[\/CHART\]|\[PLAN_ACTION\].*?\[\/PLAN_ACTION\])/s);
  return (
    <div className="space-y-3 text-slate-800 dark:text-slate-200 leading-relaxed text-sm font-medium">
      {parts.map((part, index) => {
        if (part.startsWith('[PLAN_ACTION]')) {
          try {
            const jsonStr = part.replace(/\[PLAN_ACTION\]|\[\/PLAN_ACTION\]/g, '');
            const action = JSON.parse(jsonStr);
            return (
              <div key={index} className="my-4 p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-3">
                  <Target size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">康复方案调整建议</span>
                </div>
                <h4 className="text-base font-black dark:text-white mb-1">{action.task?.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{action.task?.description}</p>
                <button
                  onClick={() => onPlanAction?.(action)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  采纳调整建议
                </button>
              </div>
            );
          } catch (e) { return null; }
        }
        if (part.startsWith('[CHART]')) {
          try {
            const chartJson = part.substring(7, part.length - 8);
            const chartData = JSON.parse(chartJson);
            return <ChartRenderer key={index} chartData={chartData} />;
          } catch (e) {
            return <div key={index} className="text-red-500">[图表渲染错误]</div>;
          }
        }
        const lines = part.split('\n');
        const parseInlineStyles = (text: string) => {
          const elements = text.split(/(\*\*.*?\*\*)/g);
          return elements.map((el, i) => {
            if (el.startsWith('**') && el.endsWith('**')) {
              return <strong key={i} className="font-black text-emerald-700 dark:text-emerald-400">{el.slice(2, -2)}</strong>;
            }
            return el;
          });
        };
        return lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed === '') return <div key={`${index}-${idx}`} className="h-1" />;
          if (trimmed.startsWith('### ')) return <h3 key={`${index}-${idx}`} className="text-base font-black mt-4 mb-2">{parseInlineStyles(trimmed.substring(4))}</h3>;
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <li key={`${index}-${idx}`} className="ml-5 list-disc list-outside">{parseInlineStyles(trimmed.substring(2))}</li>;
          const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
          if (numberedMatch) return <li key={`${index}-${idx}`} className="ml-5 list-decimal list-outside">{parseInlineStyles(numberedMatch[2])}</li>;
          return <p key={`${index}-${idx}`}>{parseInlineStyles(trimmed)}</p>;
        });
      })}
    </div>
  );
};

interface AIChatProps {
  profile: PatientProfile;
  onStartVoice: (sid?: string | null) => void;
  onBack: () => void;
  onStartAssessment: () => void;
  onReadMessages: () => void;
  isDark?: boolean;
  refreshTrigger?: number;
  voiceSessionId?: string | null;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  onPlanAction?: (action: any) => void;
}

const SUGGESTIONS = [
  "帮我推荐今日康复午餐食谱",
  "我想解读最近化验单异常",
  "感觉压力大该如何调节？"
];

const AIChat: React.FC<AIChatProps> = ({ profile, onStartVoice, onBack, onStartAssessment, onReadMessages, isDark, refreshTrigger, voiceSessionId, initialPrompt, onClearInitialPrompt, onPlanAction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // New state for context menu and editing
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number, y: number } | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // New features UI states
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem('currentAIChatSession'));
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // --- Handlers for Actions ---
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenuId(null);
  };

  const handleTTS = (text: string) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setActiveMenuId(null);
      return;
    }

    // Strip markdown formatting
    let cleanText = text
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // italic
      .replace(/#+\s/g, '') // headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/[*_~`>]/g, '') // other markdown characters
      .replace(/\n\s*-\s/g, '。') // bullet points to sentences
      .replace(/\n\s*\d+\.\s/g, '。') // numbered lists to sentences
      .replace(/\n/g, ' ')
      .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = 'zh-CN';

    const applyVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          applyVoiceAndSpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
        // Some browsers need a "kick" to load voices
        window.speechSynthesis.getVoices();
        return;
      }

      let selectedVoice: any = null;
      const voicePref = profile?.voicePreference || 'default';
      console.log("TTS voice preference:", voicePref);

      if (voicePref !== 'default' && voicePref !== '') {
        // First try exact match
        selectedVoice = voices.find(v => v.name === voicePref);

        // Then try partial match (case insensitive)
        if (!selectedVoice) {
          const lowerPref = voicePref.toLowerCase();
          selectedVoice = voices.find(v => v.name.toLowerCase().includes(lowerPref));
        }
      }

      // Preferred fallback to Google Mandarin
      if (!selectedVoice || voicePref === 'default' || voicePref === '') {
        selectedVoice = voices.find(v =>
          v.name.includes('Google') &&
          (v.name.includes('普通话') || v.name.includes('Mandarin'))
        );
      }

      // Next fallback to Meijia or any Google Mandarin
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('meijia')) ||
          voices.find(v => v.name.includes('Google') && (v.name.includes('普通话') || v.name.includes('Mandarin')));
      }

      // Final fallback to any zh-CN voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('zh-CN')) ||
          voices.find(v => v.lang.includes('zh'));
      }

      console.log("Selected TTS voice:", selectedVoice?.name || 'default');

      if (selectedVoice) {
        speech.voice = selectedVoice;
      }

      speech.onstart = () => setIsSpeaking(true);
      speech.onend = () => setIsSpeaking(false);
      speech.onerror = (e) => {
        console.error("TTS error:", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(speech);
      setActiveMenuId(null);
    };

    applyVoiceAndSpeak();
  };

  const handleDelete = async (msg: any) => {
    if (!msg.id) {
      setMessages(prev => prev.filter(m => m !== msg));
      setActiveMenuId(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/chatmessages/${msg.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => (m as any).id !== msg.id));
      }
    } catch (e) { console.error("Delete failed", e); }
    setActiveMenuId(null);
  };

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !loading) {
      handleSend(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, messages.length, loading]);

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) { }
    } else {
      handleCopy(text);
    }
    setActiveMenuId(null);
  };

  const startEditing = (msg: any) => {
    setIsEditing(msg.id);
    setEditValue(msg.text || '');
    setActiveMenuId(null);
  };

  const saveEdit = async () => {
    if (!isEditing) return;
    try {
      const res = await fetch(`${API_URL}/api/chatmessages/${isEditing}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editValue })
      });
      if (res.ok) {
        const editIndex = messages.findIndex(m => (m as any).id === isEditing);
        if (editIndex !== -1) {
          const newMessages = [...messages.slice(0, editIndex), { ...messages[editIndex], text: editValue }];
          setMessages(newMessages);

          const toDelete = messages.slice(editIndex + 1);
          toDelete.forEach((m: any) => {
            if (m.id) fetch(`${API_URL}/api/chatmessages/${m.id}`, { method: 'DELETE' }).catch(() => { });
          });

          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          generateResponse(editValue, newMessages);
        }
      }
    } catch (e) { console.error("Edit failed", e); }
    setIsEditing(null);
  };

  // --- Long Press Logic ---
  const handlePressStart = (e: any, msg: any, immediate = false) => {
    if (loading || !msg.id) return;
    const isTouch = e.type === 'touchstart';
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    if (immediate) {
      setActiveMenuId((msg as any).id);
      setMenuAnchor({ x: clientX, y: clientY });
      return;
    }

    pressTimerRef.current = setTimeout(() => {
      setActiveMenuId((msg as any).id);
      setMenuAnchor({ x: clientX, y: clientY });
    }, 600);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const fetchMessages = useCallback(async (before?: string) => {
    if (!auth.currentUser) return;
    try {
      let endpoint = `${API_URL}/api/messages/${auth.currentUser.uid}`;
      if (currentSessionId) {
        endpoint += `?sessionId=${encodeURIComponent(currentSessionId)}`;
      }
      if (before) {
        endpoint += (endpoint.includes('?') ? '&' : '?') + `before=${encodeURIComponent(before)}`;
      }

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.length < 20) setHasMore(false);

        if (before) {
          setMessages(prev => [...data, ...prev]);
        } else {
          setMessages(data);
          if (data.length === 0) {
            setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
          }

          // Moved unread clearing to its own useEffect for reliability
        }
      } else {
        if (!before && messages.length === 0) {
          setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
        }
      }
    } catch (e) {
      console.error("Fetch failed", e);
      if (!before && messages.length === 0) {
        setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
      }
    } finally {
      setIsInitialLoading(false);
      setIsHistoryLoading(false);
    }
  }, [profile.name, onReadMessages, currentSessionId]);

  useEffect(() => {
    // Optimization: If no session ID exists yet, we can immediately show the welcome message
    // to improve perceived performance while we check the backend.
    if (!currentSessionId && messages.length === 0) {
      setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
      setIsInitialLoading(false);
    }
    fetchMessages();
    return () => { if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); };
  }, [fetchMessages, currentSessionId]);

  // Robust unread clearing on mount and tab focus
  useEffect(() => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const clearUnread = async () => {
      try {
        await fetch(`${API_URL}/api/messages/read-all/${currentUid}`, { method: 'PATCH' });
        onReadMessages();
      } catch (e) { console.error("Failed to clear unread:", e); }
    };
    clearUnread();
  }, [auth.currentUser?.uid, onReadMessages]);

  // Re-fetch when voice overlay closes (refreshTrigger changes)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      // If a voice session just ended, switch to that session to show the messages
      if (voiceSessionId) {
        setCurrentSessionId(voiceSessionId);
        localStorage.setItem('currentAIChatSession', voiceSessionId);
      }
      // Small delay to let state settle before fetching
      setTimeout(() => fetchMessages(), 100);
    }
  }, [refreshTrigger]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !isHistoryLoading) {
      setIsHistoryLoading(true);
      const oldestMsg = messages[0];
      if (oldestMsg && oldestMsg.timestamp) {
        fetchMessages(oldestMsg.timestamp);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current && !isHistoryLoading) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isHistoryLoading]);

  const persistMessage = async (msg: ChatMessage) => {
    if (!auth.currentUser) return;
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          ...msg,
          isRead: msg.role === 'user' || !!currentSessionId // If user is in a session, mark as read
        })
      });
      if (res.ok) {
        const savedMsg = await res.json();
        if (msg.role === 'model') onReadMessages(); // Trigger UI count update
        return savedMsg;
      }
    } catch (e) { console.error("Persist failed", e); }
    return null;
  };

  const generateResponse = async (userText: string, currentMsgs: ChatMessage[]) => {
    setMessages([...currentMsgs, { role: 'model', text: '', timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      let responseText = '';
      
      // Always use the Express backend's get-ai-chat-reply for production and dev stability
      try {
        const res = await fetch(`${API_URL}/api/get-ai-chat-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userText, 
            profile, 
            history: currentMsgs.slice(-5).map(m => ({ role: m.role, content: m.text })) 
          })
        });
        if (res.ok) {
          const data = await res.json();
          responseText = data.reply;
        } else {
          console.error("AI reply failed with status:", res.status);
        }
      } catch (e) { 
        console.error("Express AI reply failed:", e); 
      }

      let index = 0;
      streamIntervalRef.current = setInterval(() => {
        if (index < responseText.length) {
          const currentText = responseText.substring(0, index + 1);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, text: currentText }];
          });
          index++;
        } else {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          setLoading(false);
          const finalModelMsg = {
            role: 'model' as const,
            text: responseText,
            timestamp: new Date().toISOString(),
            sessionId: currentSessionId // Ensure sessionId is attached for persistence
          };
          persistMessage(finalModelMsg).then(savedModelMsg => {
            if (savedModelMsg && savedModelMsg.id) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.role === 'model' && last.text === responseText) {
                  return [...prev.slice(0, -1), { ...last, id: savedModelMsg.id }];
                }
                return prev;
              });
            }
          });
        }
      }, 25);
    } catch (error: any) {
      setLoading(false);
      console.error("Chat Error:", error);
      const errorMsg = { role: 'model' as const, text: "抱歉，由于网络问题，我现在无法回答。请检查您的连接或稍后再试。", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev.slice(0, -1), errorMsg]);
    }
  };

  const handleSend = async (customText?: string) => {
    if (!auth.currentUser) return;
    const messageText = customText || input.trim();
    if (!messageText) return;

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    setInput('');
    setIsMoreMenuOpen(false);

    // Auto-generate session ID if not exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `sess_${Date.now()}`;
      setCurrentSessionId(sessionId);
      localStorage.setItem('currentAIChatSession', sessionId);
    }

    const userMsg: any = {
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString(),
      sessionId,
      sessionTitle: messageText.substring(0, 15) + (messageText.length > 15 ? '...' : '')
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    persistMessage(userMsg).then(savedUserMsg => {
      if (savedUserMsg && savedUserMsg.id) {
        setMessages(prev => prev.map(m => m === userMsg ? { ...m, id: savedUserMsg.id } : m));
      }
    });

    generateResponse(messageText, newMessages);
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      alert("您的浏览器不支持地理位置功能。");
      return;
    }
    setIsMoreMenuOpen(false);

    // Auto-generate session ID early if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = `sess_${Date.now()}`;
      setCurrentSessionId(sessionId);
      localStorage.setItem('currentAIChatSession', sessionId);
    }

    const loadingMsg: ChatMessage = {
      role: 'user',
      text: "📍 正在尝试感知并同步您的环境数据...",
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, loadingMsg]);
    setLoading(true);

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude: lat, longitude: lng } = position.coords;
        const res = await fetch(`${API_URL}/api/users/${auth.currentUser?.uid}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng })
        });

        if (res.ok) {
          const data = await res.json();
          const weatherStr = `${data.weather.weather}, ${data.weather.temperature}, 湿度 ${data.weather.humidity}`;
          const userText = `📍 我在 ${data.locationName} (${weatherStr})`;

          const userMsgObj: ChatMessage = {
            role: 'user',
            text: userText,
            timestamp: new Date().toISOString(),
            sessionId
          };

          const savedUserMsg = await persistMessage(userMsgObj);
          const finalUserMsg = savedUserMsg || userMsgObj;

          const promptMsg = `患者刚刚分享了此刻所属的新位置：${data.locationName}。当地目前天气状况为：${weatherStr}。请基于该地区当下的真实气候与环境，向他提供严谨、贴切的起居、身心和饮食防护调整干预。`;

          let nextMsgs: ChatMessage[] = [];
          setMessages(prev => {
            nextMsgs = prev.map(m => m === loadingMsg ? finalUserMsg : m);
            return nextMsgs;
          });

          // Important: Trigger AI response OUTSIDE the state updater to avoid React 18/Strict Mode loops
          generateResponse(promptMsg, nextMsgs);
        } else {
          throw new Error("Location API failed");
        }
      } catch (err) {
        console.error(err);
        setMessages(prev => prev.filter(m => m !== loadingMsg));
        alert("位置同步失败，请检查网络后重试。");
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setMessages(prev => prev.filter(m => m !== loadingMsg));
      setLoading(false);
      alert("无法获取位置，请检查设备的定位权限。");
    }, { timeout: 10000 });
  };

  const startNewChat = () => {
    const newId = `sess_${Date.now()}`;
    setCurrentSessionId(newId);
    localStorage.setItem('currentAIChatSession', newId);
    setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
    setShowHistory(false);
  };

  const deleteSession = async (sid: string) => {
    try {
      await fetch(`${API_URL}/chat/sessions/${sid}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (currentSessionId === sid) {
        startNewChat();
      }
    } catch (e) { console.error("Delete session failed", e); }
  };

  useEffect(() => {
    if (showHistory && auth.currentUser) {
      fetch(`${API_URL}/chat/sessions/${auth.currentUser.uid}`)
        .then(res => res.json())
        .then(data => setSessions(data))
        .catch(e => console.error("Fetch sessions failed", e));
    }
  }, [showHistory]);

  return (
    <div className={`flex flex-col h-screen relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#050912]' : 'bg-[#f8fafc]'}`}>
      {/* Header */}
      <header className={`absolute top-0 left-0 right-0 z-50 p-6 pt-12 flex justify-between items-center backdrop-blur-md border-b transition-colors duration-500 ${isDark ? 'bg-[#050912]/80 border-white/5' : 'bg-white/80 border-slate-100'}`}>
        <button onClick={onBack} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm active:scale-90 transition-transform">
          <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
        </button>
        <div className="text-center font-outfit">
          <div className="flex items-center justify-center space-x-1.5 mb-0.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <h3 className="font-black text-sm text-slate-800 dark:text-white tracking-widest uppercase">AI五养专家</h3>
          </div>
        </div>
        <button onClick={() => setShowHistory(true)} className="w-11 h-11 bg-white dark:bg-[#111827] rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-sm active:scale-90 transition-transform">
          <History size={22} className="text-slate-600 dark:text-slate-300" />
        </button>
      </header>

      {/* Messages */}
      <main ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 space-y-8 pb-40 pt-40 custom-scrollbar">
        {isInitialLoading ? (
          <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-4">
                {isHistoryLoading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest flex items-center"><History size={12} className="mr-1" /> 向上滑动加载历史</div>}
              </div>
            )}
            {!(profile.isQuestionnaireComplete || !!profile.questionnaire?.chiefComplaint) && (
              <button onClick={onStartAssessment} className="w-full bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex items-center space-x-4 border border-amber-200 dark:border-amber-800 animate-in fade-in">
                <div className="p-2 bg-amber-500 text-white rounded-lg"><AlertTriangle size={18} /></div>
                <div className="flex-1 text-left"><p className="font-bold text-amber-800 dark:text-amber-300 text-sm">立即完成康复评估</p><p className="text-[10px] text-amber-600">获取更精准的建议</p></div>
                <ChevronRight size={16} className="text-amber-400" />
              </button>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-emerald-500/10 flex items-center justify-center text-lg shrink-0 border-2 border-white/10 dark:border-white/5 shadow-sm backdrop-blur-md">🤖</div>}
                <div
                  onMouseDown={(e) => handlePressStart(e, msg)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={(e) => handlePressStart(e, msg)}
                  onTouchEnd={handlePressEnd}
                  onContextMenu={(e) => { e.preventDefault(); handlePressStart(e, msg, true); }}
                  className={`max-w-[85%] inline-block px-5 py-4 rounded-t-[28px] shadow-sm transition-transform active:scale-[0.98] cursor-pointer backdrop-blur-md ${msg.role === 'user' ? 'bg-emerald-600 text-white font-bold rounded-l-[28px] shadow-[0_8px_20px_rgba(16,185,129,0.2)]' : 'bg-white dark:bg-[#111827]/60 border border-slate-100 dark:border-emerald-500/10 rounded-r-[28px]'}`}
                >
                  <div className="flex flex-col">
                    {(msg as any).type === 'intervention' && (
                      <div className="flex items-center space-x-1.5 mb-2 py-1 px-2 bg-emerald-500/10 rounded-lg w-fit">
                        <Sparkles size={10} className="text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">干预建议</span>
                      </div>
                    )}
                    {msg.role === 'model' ? (
                      msg.text ? <MarkdownContent content={msg.text} onPlanAction={onPlanAction} /> : (
                        <div className="flex space-x-1.5 items-center h-5 px-2">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                      )
                    ) : <p className="text-sm leading-relaxed">{msg.text}</p>}
                  </div>
                  <span className={`text-[8px] absolute -bottom-6 uppercase tracking-widest opacity-80 ${msg.role === 'user' ? 'right-2 text-slate-300' : 'left-2 text-slate-300'}`}>
                    {new Date(msg.timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Suggested Questions */}
            {messages.length > 0 && messages[messages.length - 1].role === 'model' && !loading && (
              <div className="flex flex-col space-y-3 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                  <span className="font-black text-sm">您可以尝试问我：</span>
                </div>
                <div className="flex flex-col space-y-3">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="w-fit px-6 py-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full text-emerald-700 dark:text-emerald-400 text-sm font-bold shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:scale-95 transition-all text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Context Menu Overlay */}
      {activeMenuId && menuAnchor && (
        <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenuId(null)}>
          <div
            className="absolute bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-2 min-w-[140px] animate-in zoom-in-95 duration-200"
            style={{
              top: Math.min(menuAnchor.y, window.innerHeight - 250),
              left: Math.min(menuAnchor.x, window.innerWidth - 160)
            }}
          >
            {messages.find(m => (m as any).id === activeMenuId)?.role === 'model' ? (
              <>
                <button onClick={() => handleTTS(messages.find(m => (m as any).id === activeMenuId)?.text || '')} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                  {isSpeaking ? (
                    <>
                      <StopCircle size={18} className="text-red-500" />
                      <span className="text-sm font-bold text-red-500">停止播报</span>
                    </>
                  ) : (
                    <>
                      <Mic size={18} className="text-emerald-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">播报</span>
                    </>
                  )}
                </button>
                <button onClick={() => handleCopy(messages.find(m => (m as any).id === activeMenuId)?.text || '')} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                  <MessageSquare size={18} className="text-blue-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">复制</span>
                </button>
                <button onClick={() => handleShare(messages.find(m => (m as any).id === activeMenuId)?.text || '')} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                  <Send size={18} className="text-purple-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">分享</span>
                </button>
                <hr className="my-1 border-slate-100 dark:border-slate-700" />
                <button onClick={() => handleDelete(messages.find(m => (m as any).id === activeMenuId))} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors group">
                  <X size={18} className="text-red-500" />
                  <span className="text-sm font-bold text-red-500">删除</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleCopy(messages.find(m => (m as any).id === activeMenuId)?.text || '')} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                  <MessageSquare size={18} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">复制</span>
                </button>
                <button onClick={() => startEditing(messages.find(m => (m as any).id === activeMenuId))} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors">
                  <Calendar size={18} className="text-amber-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">编辑</span>
                </button>
                <hr className="my-1 border-slate-100 dark:border-slate-700" />
                <button onClick={() => handleDelete(messages.find(m => (m as any).id === activeMenuId))} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors">
                  <X size={18} className="text-red-500" />
                  <span className="text-sm font-bold text-red-500">删除</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Editing Modal - Constrained to Container */}
      {isEditing && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#161d2b] w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 border border-slate-100 dark:border-slate-800/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">编辑消息</h3>
              <button onClick={() => setIsEditing(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl btn-active-scale"><X size={18} /></button>
            </div>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-32 bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 ring-emerald-500/50 rounded-2xl p-4 text-sm font-medium mb-6 resize-none"
              placeholder="输入修改内容..."
            />
            <div className="flex space-x-3">
              <button onClick={() => setIsEditing(null)} className="flex-1 py-4 font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-2xl active:scale-95 transition-all">取消</button>
              <button onClick={saveEdit} className="flex-2 px-8 py-4 font-bold text-white bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">保存修改</button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="p-6 pb-10">
        <div className={`relative bg-white dark:bg-[#111827] rounded-[40px] shadow-2xl border transition-all duration-500 ${isMoreMenuOpen ? 'pb-32' : 'pb-0'} ${isDark ? 'border-white/5' : 'border-slate-100'}`}>

          {/* Expansion Menu Content */}
          {isMoreMenuOpen && (
            <div className="absolute top-20 left-0 right-0 px-8 py-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: ImageIcon, label: '相册', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', onClick: () => { } },
                  { icon: Camera, label: '拍摄', color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', onClick: () => { } },
                  { icon: PhoneCall, label: '语音通话', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', onClick: () => onStartVoice(currentSessionId) },
                  { icon: MapPin, label: '位置', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', onClick: handleLocationClick },
                ].map((item, idx) => (
                  <button key={idx} onClick={item.onClick} className="flex flex-col items-center space-y-2 group">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all group-active:scale-90 ${item.color}`}>
                      <item.icon size={22} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="h-20 px-4 flex items-center space-x-3">
            <button
              onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
              className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors"
            >
              {inputMode === 'text' ? <AudioLines size={22} /> : <Keyboard size={22} />}
            </button>

            <div className="flex-1 relative">
              {inputMode === 'text' ? (
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={loading ? "思考中..." : "输入对话..."}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 ring-emerald-500/20 rounded-full px-6 pr-12 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              ) : (
                <button
                  onMouseDown={() => { setIsRecording(true); if (window.navigator.vibrate) window.navigator.vibrate(50); }}
                  onMouseUp={() => setIsRecording(false)}
                  onTouchStart={() => { setIsRecording(true); if (window.navigator.vibrate) window.navigator.vibrate(50); }}
                  onTouchEnd={() => setIsRecording(false)}
                  className={`w-full h-12 rounded-full font-black text-sm transition-all flex items-center justify-center space-x-2 ${isRecording ? 'bg-emerald-600 text-white scale-95' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  {isRecording ? <div className="flex items-center space-x-1"><div className="w-1 h-3 bg-white/50 animate-pulse"></div><div className="w-1 h-5 bg-white animate-pulse [animation-delay:0.1s]"></div><div className="w-1 h-3 bg-white/50 animate-pulse [animation-delay:0.2s]"></div><span>录音中...</span></div> : <span>按住 说话</span>}
                </button>
              )}
              {inputMode === 'text' && (
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors">
                  <Mic size={20} />
                </button>
              )}
            </div>

            <button
              onClick={() => input.trim() ? handleSend() : setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isMoreMenuOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 rotate-45'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'
                }`}
            >
              {input.trim() ? <Send size={20} className="text-emerald-600" /> : <Plus size={24} />}
            </button>
          </div>
        </div>
      </footer>

      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-[100] flex animate-in fade-in duration-300">
          <div className="w-[85%] max-w-sm bg-white dark:bg-[#050912] border-r border-slate-200 dark:border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-8 pt-16 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <History size={24} className="text-emerald-500" />
                <h2 className="font-black text-xl text-slate-800 dark:text-slate-100">对话历史</h2>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              <button
                onClick={startNewChat}
                className="w-full p-6 border-2 border-dashed border-emerald-500/30 rounded-[32px] flex items-center justify-center space-x-2 text-emerald-600 font-black hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors mb-6 btn-active-scale"
              >
                <Plus size={20} />
                <span>开启新对话</span>
              </button>

              {sessions.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-sm italic font-medium">暂无历史对话</div>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className={`group p-5 rounded-[28px] border transition-all cursor-pointer relative ${currentSessionId === s.id ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}>
                    <div onClick={() => { setCurrentSessionId(s.id); localStorage.setItem('currentAIChatSession', s.id); fetchMessages(); setShowHistory(false); }} className="pr-10">
                      <p className="font-black text-slate-800 dark:text-slate-200 text-sm mb-1 truncate">{s.title || '无标题会话'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{new Date(s.timestamp || Date.now()).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex-1 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
        </div>
      )}
    </div>
  );
};

export default AIChat;


import React from 'react';
import { 
  Utensils, 
  Activity, 
  Moon, 
  Brain, 
  HeartPulse,
  LayoutDashboard,
  ClipboardCheck,
  MessageCircle,
  ShoppingBag,
  User,
  Wind
} from 'lucide-react';

export const RISK_SIGNALS = [
  "持续高热（>38.5℃）",
  "呼吸困难 / 咯血",
  "意识模糊 / 抽搐",
  "剧烈腹痛 / 便血",
  "骨折部位剧痛"
];

export const NURSING_ICONS: Record<string, React.ReactNode> = {
  diet: <Utensils className="w-5 h-5" />,
  '食疗': <Utensils className="w-5 h-5" />,
  exercise: <Activity className="w-5 h-5" />,
  '运动': <Activity className="w-5 h-5" />,
  sleep: <Moon className="w-5 h-5" />,
  '睡眠': <Moon className="w-5 h-5" />,
  mental: <Brain className="w-5 h-5" />,
  '心理': <Brain className="w-5 h-5" />,
  function: <HeartPulse className="w-5 h-5" />,
  '机能': <HeartPulse className="w-5 h-5" />,
  environment: <Wind className="w-5 h-5" />,
  '环境': <Wind className="w-5 h-5" />,
  diet_herbal: <Utensils className="w-5 h-5 text-amber-600" />,
  custom: <Activity className="w-5 h-5" />,
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: '首页', icon: <LayoutDashboard size={22} /> },
  { id: 'program', label: '计划', icon: <ClipboardCheck size={22} /> },
  { id: 'chat', label: 'AI 教练', icon: <MessageCircle size={22} /> },
  { id: 'mall', label: '商城', icon: <ShoppingBag size={22} /> },
  { id: 'profile', label: '我的', icon: <User size={22} /> },
];

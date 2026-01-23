
import React from 'react';
import { 
  Utensils, 
  Activity, 
  Moon, 
  Heart, 
  Zap,
  LayoutDashboard,
  ClipboardCheck,
  MessageCircle,
  ShoppingBag,
  User
} from 'lucide-react';

export const RISK_SIGNALS = [
  "持续高热（>38.5℃）",
  "呼吸困难 / 咯血",
  "意识模糊 / 抽搐",
  "剧烈腹痛 / 便血",
  "骨折部位剧痛"
];

export const NURSING_ICONS = {
  diet: <Utensils className="w-5 h-5" />,
  exercise: <Activity className="w-5 h-5" />,
  sleep: <Moon className="w-5 h-5" />,
  mental: <Heart className="w-5 h-5" />,
  function: <Zap className="w-5 h-5" />,
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: '健康看板', icon: <LayoutDashboard size={22} /> },
  { id: 'program', label: '康复计划', icon: <ClipboardCheck size={22} /> },
  { id: 'chat', label: 'AI 教练', icon: <MessageCircle size={22} /> },
  { id: 'mall', label: '康养商城', icon: <ShoppingBag size={22} /> },
  { id: 'profile', label: '个人中心', icon: <User size={22} /> },
];

import React, { useState } from 'react';
import { PatientProfile, NursingScores, DailyTask } from '../types';
import { fetchWearableMetrics } from '../services/healthService';
import RadarWidget from './Home/widgets/RadarWidget';
import MetricGridWidget from './Home/widgets/MetricGridWidget';
import ReportBannerWidget from './Home/widgets/ReportBannerWidget';
import QuestionnaireAlert from './Home/widgets/QuestionnaireAlert';
import EnvironmentalWidget from './Home/widgets/EnvironmentalWidget';
import AIInsightsWidget from './Home/widgets/AIInsightsWidget';

interface HomeProps {
  profile: PatientProfile;
  tasks: DailyTask[];
  unreadCount: number;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
  onSelectNursing: (nursing: keyof NursingScores) => void;
  updatedCategory?: keyof NursingScores | null;
  onStartReport: () => void;
  onStartAssessment: () => void;
  onCalculateIndex: () => Promise<any>;
  isDark?: boolean;
}

/**
 * 仪表盘配置化架构
 * 支持根据用户需求或康复阶段动态调整看板布局
 */
const Home: React.FC<HomeProps> = ({ 
  profile, 
  tasks,
  unreadCount, 
  onUpdateProfile, 
  onSelectNursing, 
  updatedCategory, 
  onStartReport, 
  onStartAssessment, 
  onCalculateIndex,
  isDark 
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const wearableData = await fetchWearableMetrics();
      await onCalculateIndex();
      onUpdateProfile({
        wearable: { ...profile.wearable, isConnected: true, lastSync: new Date().toISOString(), ...wearableData }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- 插件化布局系统 (Layout System) ---
  // 该配置现优先从 profile.dashboardConfig 获取，支持后端下发针对不同患者的定制化看板
  const layout = profile.dashboardConfig || 
                 ['QUESTIONNAIRE_ALERT', 'REPORT_BANNER', 'RADAR_CHART', 'AI_INSIGHTS', 'METRIC_GRID'];

  const renderWidget = (type: string) => {
    switch (type) {
      case 'QUESTIONNAIRE_ALERT':
        return <QuestionnaireAlert key={type} profile={profile} onStartAssessment={onStartAssessment} />;
      case 'REPORT_BANNER':
        return <ReportBannerWidget key={type} onStartReport={onStartReport} />;
      case 'RADAR_CHART':
        return <RadarWidget key={type} profile={profile} onSync={handleSync} isSyncing={isSyncing} isDark={isDark} />;
      case 'AI_INSIGHTS':
        return <AIInsightsWidget key={type} profile={profile} />;
      case 'ENVIRONMENTAL_WIDGET':
        return <EnvironmentalWidget key={type} profile={profile} />;
      case 'METRIC_GRID':
        return <MetricGridWidget key={type} profile={profile} tasks={tasks} onSelectNursing={onSelectNursing} updatedCategory={updatedCategory} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-5 space-y-8 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {layout.map(widgetType => renderWidget(widgetType))}
    </div>
  );
};

export default Home;

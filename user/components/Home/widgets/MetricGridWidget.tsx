import { PatientProfile, NursingScores, DailyTask } from '../../../types';
import { NURSING_ICONS } from '../../../constants';
import { MetricCard } from './Shared';
import { Activity } from 'lucide-react';

interface MetricGridWidgetProps {
  profile: PatientProfile;
  tasks: DailyTask[];
  onSelectNursing: (nursing: keyof NursingScores) => void;
  updatedCategory?: keyof NursingScores | null;
}

const MetricGridWidget: React.FC<MetricGridWidgetProps> = ({ profile, tasks, onSelectNursing, updatedCategory }) => {
  const getTaskStatus = (cat: string) => {
    const catTasks = tasks.filter(t => t.category?.toLowerCase() === cat.toLowerCase());
    if (!catTasks.length) return '今日暂无计划';
    const completed = catTasks.filter(t => t.completed).length;
    return `今日已完成 ${completed}/${catTasks.length}`;
  };

  const steps = profile.wearable?.steps || 0;
  const distance = (steps * 0.0007).toFixed(1); // 粗略换算 km
  
  const symptoms = profile.todaySymptoms || [];
  const symptomLabel = symptoms.length === 0 ? '今日身体无异常' : `发现 ${symptoms.length} 项不适症状`;

  const getCategorySeverity = (cat: string, score: number, baseline: number) => {
    if (cat === 'function') {
      return symptoms.length > 0 ? (symptoms.length > 2 ? 'critical' : 'warning') : undefined;
    }
    
    // Check task completion for other categories
    const catTasks = tasks.filter(t => t.category?.toLowerCase() === cat.toLowerCase());
    if (catTasks.length > 0 && catTasks.every(t => !t.completed)) {
      // If none of the tasks are completed, it's a warning flag
      return 'warning';
    }

    const diff = score - baseline;
    return diff < -20 ? 'critical' : diff < 0 ? 'warning' : 'normal';
  };

  const baselines = profile.baselines || { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 80 };

  return (
    <div className="space-y-4">
      {/* 模块标题栏 */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center space-x-2">
          <Activity size={18} className="text-emerald-500" />
          <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">五养数据看板</h3>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">实时健康指标</span>
      </div>

      {/* 两列网格布局 */}
      <div className="grid grid-cols-2 gap-5">
        <MetricCard 
          onClick={() => onSelectNursing('exercise')} 
          title="运动调养" 
          score={profile.scores.exercise} 
          baseline={baselines.exercise}
          label={`今日步行 ${distance}km`} 
          icon={NURSING_ICONS.exercise} 
          isHighlighted={updatedCategory === 'exercise'} 
          severity={getCategorySeverity('exercise', profile.scores.exercise, baselines.exercise)}
        />
        <MetricCard 
          onClick={() => onSelectNursing('diet')} 
          title="饮食调养" 
          score={profile.scores.diet} 
          baseline={baselines.diet}
          label={getTaskStatus('diet')} 
          icon={NURSING_ICONS.diet} 
          isHighlighted={updatedCategory === 'diet'} 
          severity={getCategorySeverity('diet', profile.scores.diet, baselines.diet)}
        />
        <MetricCard 
          onClick={() => onSelectNursing('mental')} 
          title="心理舒缓" 
          score={profile.scores.mental} 
          baseline={baselines.mental}
          label={getTaskStatus('mental')} 
          icon={NURSING_ICONS.mental} 
          isHighlighted={updatedCategory === 'mental'} 
          severity={getCategorySeverity('mental', profile.scores.mental, baselines.mental)}
        />
        <MetricCard 
          onClick={() => onSelectNursing('sleep')} 
          title="膏方调养" 
          score={profile.scores.sleep} 
          baseline={baselines.sleep}
          label={getTaskStatus('sleep')} 
          icon={NURSING_ICONS.sleep} 
          isHighlighted={updatedCategory === 'sleep'} 
          severity={getCategorySeverity('sleep', profile.scores.sleep, baselines.sleep)}
        />
        <div className="col-span-2">
          <MetricCard 
            onClick={() => onSelectNursing('function')} 
            title="功能康复" 
            score={profile.scores.function} 
            baseline={baselines.function}
            label={symptomLabel} 
            icon={NURSING_ICONS.function} 
            isHighlighted={updatedCategory === 'function'} 
            severity={getCategorySeverity('function', profile.scores.function, baselines.function)}
            horizontal 
          />
        </div>
      </div>
    </div>
  );
};


export default MetricGridWidget;

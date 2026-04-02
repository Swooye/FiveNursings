import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { PatientProfile } from '../../../types';

interface QuestionnaireAlertProps {
  profile: PatientProfile;
  onStartAssessment: () => void;
}

const QuestionnaireAlert: React.FC<QuestionnaireAlertProps> = ({ profile, onStartAssessment }) => {
  if (profile.isQuestionnaireComplete || !!profile.questionnaire?.chiefComplaint) return null;

  return (
    <button 
      onClick={onStartAssessment}
      className="w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 rounded-[32px] p-6 text-left flex items-center justify-between group btn-active-scale transition-all"
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
           <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-base font-black text-rose-700 dark:text-rose-400 uppercase tracking-tight">请立即完成康复评估</h3>
          <p className="text-xs text-rose-600/70 dark:text-rose-400/60 font-bold mt-1 leading-relaxed">
            {profile.isVIP ? '您已是尊享会员，但' : ''}缺少您的病情数据，专家团队无法为您生成康复方案。
          </p>
        </div>
      </div>
      <ChevronRight size={20} className="text-rose-300 group-hover:translate-x-1 transition-transform" />
    </button>
  );
};

export default QuestionnaireAlert;

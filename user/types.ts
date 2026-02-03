
export enum CancerType {
  LUNG = '肺癌',
  COLORECTAL = '结直肠癌',
  THYROID = '甲状腺癌',
  LIVER = '肝癌',
  STOMACH = '胃癌',
  BREAST = '乳腺癌',
  GYNECOLOGICAL = '妇科肿瘤',
  OTHER = '其他'
}

export enum TreatmentStage {
  UNTREATED = '未经治',
  POST_OP_30 = '术后30天内',
  CHEMO = '化疗中',
  RADIO = '放疗中',
  TARGETED = '靶向治疗中',
  IMMUNO = '免疫治疗中',
  LIVING_WITH = '带瘤生存',
  STABLE_FOLLOWUP = '稳定随访期'
}

export interface NursingScores {
  diet: number;
  exercise: number;
  sleep: number;
  mental: number;
  function: number;
}

export interface WearableData {
  deviceType: 'Apple Watch' | 'Fitbit' | 'Garmin' | 'None';
  lastSync: string | null;
  isConnected: boolean;
}

export interface TCMAnalysisResult {
  constitutionType: string;
  constitutionAnalysis: string;
  tongueDiagnosis: {
    color: string;
    shape: string;
    coating: string;
    clinicalMeaning: string;
  };
  faceDiagnosis: {
    complexion: string;
    luster: string;
    organReflex: string;
    clinicalMeaning: string;
  };
  syndromeDifferentiation: string;
  rehabAdvice: string[];
  dietaryTaboos: string[];
}

export interface HealthQuestionnaireData {
  chiefComplaint: string;
  pastTreatments: string[];
  currentTreatments: string[];
  chronicDiseases: string[];
  lifestyle: { 
    smoking: { 
      status: boolean; 
      years?: string; 
      packsPerDay?: string; 
      isQuit?: boolean; 
      quitYears?: string 
    };
    drinking: { 
      status: boolean; 
      years?: string; 
      amountPerDay?: string; 
      isQuit?: boolean; 
      quitYears?: string 
    };
    exercise: { 
      status: boolean; 
      timesPerWeek?: string; 
      hoursPerTime?: string; 
      type?: string 
    };
    dietHabit: string;
    dietHabitOther?: string;
  };
  currentDiscomfort: string;
  reports?: string[]; 
  tonguePhoto?: string; 
  facePhoto?: string; 
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  gender: '男' | '女';
  birthDate: string;
  avatarSeed: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  birthDate?: string;
  gender?: '男' | '女';
  height?: number;
  weight?: number;
  cancerType: CancerType;
  stage: TreatmentStage;
  scores: NursingScores;
  hasWarnings: boolean;
  wearable: WearableData;
  isProfileComplete?: boolean;
  isQuestionnaireComplete?: boolean;
  questionnaire?: HealthQuestionnaireData;
  familyMembers?: FamilyMember[];
  tcmAnalysisResult?: TCMAnalysisResult;
  // Membership fields
  isVIP: boolean;
  vipExpiry?: string;
  coachSessionsRemaining: number;
  referralCode: string;
  // AI Voice setting
  voicePreference?: string;
}

export interface DailyTask {
  id: string;
  category: 'diet' | 'exercise' | 'sleep' | 'mental' | 'function';
  title: string;
  time: string;
  completed: boolean;
  description: string;
}

export interface SKU {
  id: string;
  name: string;
  price: number;
  memberPrice: number; // 70% of regular price
  image: string;
  reason: string;
  nursingType: keyof NursingScores;
  isMemberOnly?: boolean;
}

export interface CartItem extends SKU {
  quantity: number;
  selected?: boolean;
}

export interface VoiceLog {
  id: string;
  timestamp: string;
  summary: string;
  impact: {
    category: keyof NursingScores;
    change: number;
  };
}

export interface WellnessImage {
  id: string;
  url: string;
  type: 'tongue' | 'meal' | 'report' | 'face';
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: string;
}

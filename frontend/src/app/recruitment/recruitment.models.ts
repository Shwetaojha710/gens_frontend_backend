export type RecruitmentStageKey =
  | 'job_requirement'
  | 'posting'
  | 'candidate_applied'
  | 'ats_screening'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_in_progress'
  | 'offered'
  | 'closed'
  | 'rejected';

export interface RecruitmentStage {
  key: RecruitmentStageKey;
  label: string;
  description: string;
  completed?: boolean;
  active?: boolean;
}

export interface AtsScoreCard {
  ats_score: number;
  manual_score: number;
  final_score: number;
  scanned_at?: string;
  scanned_by?: string;
  notes?: string;
  shortlisted?: boolean;
}

export interface InterviewRoundPlan {
  round_id: string;
  round_name: string;
  round_type?: string;
  sequence: number;
  interviewer_id?: string;
  interviewer_name?: string;
  interviewer_email?: string;
  interviewer_phone?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  mode?: string;
  meeting_link?: string;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  feedback_submitted?: boolean;
}

export interface CandidateApplicationRecord {
  id: string;
  candidate_id?: string;
  job_id: string;
  job_posting_id?: string;
  job_title: string;
  department?: string;
  stage: RecruitmentStageKey;
  status: string;
  name: string;
  email: string;
  phone: string;
  current_company?: string;
  experience?: number | string;
  current_ctc?: number | string;
  expected_ctc?: number | string;
  notice_period?: number | string;
  skills?: any[] | any;
  resume_url?: string;
  resume_name?: string;
  img_base_url?: string;
  createdAt?: string;
  ats?: AtsScoreCard;
  interview_rounds?: InterviewRoundPlan[];
}

export interface CandidatePipelinePayload {
  stage?: string;
  status?: string;
  search?: string;
  job_id?: string;
}

export interface CandidateScorePayload {
  application_id: string;
  ats_score?: number;
  manual_score?: number;
  notes?: string;
  shortlisted?: boolean;
}

export interface InterviewSchedulePayload {
  application_id: string;
  job_id: string;
  rounds: InterviewRoundPlan[];
}

export interface InterviewFeedbackPayload {
  application_id: string;
  round_id: string;
  interviewer_name: string;
  interviewer_email?: string;
  rating: number;
  recommendation: 'selected' | 'hold' | 'rejected';
  strengths?: string;
  concerns?: string;
  notes?: string;
}

export interface InterviewPanelUser {
  id?: string | number;
  first_name: string;
  last_name: string;
  email: string;
  department: string | number;
  designation: string | number;
  mobile_no: string;
  gender?: 'male' | 'female' | 'other' | null;
  status?: 'active' | 'inactive';
  si_no?: number;
  department_name?: string;
  designation_name?: string;
  password?: any;
}

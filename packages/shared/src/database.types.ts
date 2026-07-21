// Hand-authored mirror of the Supabase schema (supabase/migrations/*.sql).
// Regenerate with `supabase gen types typescript` once a live project exists;
// this file keeps web/mobile compiling against the same shape until then.

export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;

export interface Profile {
  id: UUID;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Subject {
  id: UUID;
  code: string;
  name: string;
  category: "core" | "aptitude";
  marks_weight: number;
  sort_order: number;
}

export interface Question {
  id: UUID;
  subject_id: UUID;
  prompt: string;
  options: { key: string; text: string }[];
  correct_option: string;
  question_type: "mcq" | "msq" | "nat";
  explanation: string | null;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  negative_marks: number;
  source: "official" | "community";
  created_by: UUID | null;
  is_active: boolean;
  created_at: ISODateTime;
}

export type MockType = "standard" | "sectional" | "custom" | "daily_drill" | "weakness_drill";

export interface Mock {
  id: UUID;
  title: string;
  description: string | null;
  mock_type: MockType;
  source: "official" | "community";
  marks_total: number;
  duration_minutes: number;
  created_by: UUID | null;
  status: "draft" | "published" | "archived";
  created_at: ISODateTime;
}

export interface UserUploadedMock {
  id: UUID;
  mock_id: UUID;
  uploader_id: UUID;
  original_filename: string;
  file_format: "csv" | "json";
  storage_path: string;
  parsed_question_count: number;
  upvotes_count: number;
  created_at: ISODateTime;
}

export type AttemptType = "daily_drill" | "standard_mock" | "sectional_mock" | "custom_mock" | "weakness_drill";

export interface Attempt {
  id: UUID;
  user_id: UUID;
  mock_id: UUID | null;
  attempt_type: AttemptType;
  status: "in_progress" | "submitted" | "abandoned";
  started_at: ISODateTime;
  submitted_at: ISODateTime | null;
  total_marks: number;
  obtained_marks: number;
  percentage: number | null;
  created_at: ISODateTime;
}

export interface AttemptAnswer {
  id: UUID;
  attempt_id: UUID;
  question_id: UUID;
  selected_option: string | null;
  is_correct: boolean | null;
  marks_awarded: number;
  answered_at: ISODateTime;
}

export interface MockResult {
  id: UUID;
  attempt_id: UUID;
  user_id: UUID;
  mock_id: UUID | null;
  score_percentage: number;
  percentile: number | null;
  xp_awarded: number;
  triggered_penalty: boolean;
  created_at: ISODateTime;
}

export interface RankThreshold {
  rank_name: string;
  min_xp: number;
  sort_order: number;
}

export interface UserProgress {
  user_id: UUID;
  xp_total: number;
  rank_name: string;
  current_streak: number;
  best_streak: number;
  last_drill_date: ISODate | null;
  locked: boolean;
  active_penalty_drill_id: UUID | null;
  questions_solved: number;
  questions_correct: number;
  accuracy_pct: number;
  updated_at: ISODateTime;
}

export interface StreakLogEntry {
  user_id: UUID;
  drill_date: ISODate;
  completed: boolean;
  attempt_id: UUID | null;
  xp_earned: number;
  created_at: ISODateTime;
}

export interface XpTransaction {
  id: UUID;
  user_id: UUID;
  amount: number;
  reason: "daily_drill" | "mock_submit" | "streak_bonus" | "weakness_drill_clear" | "note_upvoted" | "manual_adjustment";
  ref_type: string | null;
  ref_id: UUID | null;
  created_at: ISODateTime;
}

export interface PenaltyDrill {
  id: UUID;
  user_id: UUID;
  triggered_by_attempt_id: UUID;
  weak_subject_ids: UUID[];
  drill_mock_id: UUID | null;
  status: "active" | "cleared";
  created_at: ISODateTime;
  cleared_at: ISODateTime | null;
}

export interface Note {
  id: UUID;
  user_id: UUID;
  subject_id: UUID | null;
  title: string;
  content: string | null;
  file_url: string | null;
  file_type: "pdf" | "image" | null;
  visibility: "public" | "private";
  upvotes_count: number;
  downloads_count: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface NoteVote {
  note_id: UUID;
  user_id: UUID;
  created_at: ISODateTime;
}

export interface PushToken {
  id: UUID;
  user_id: UUID;
  expo_push_token: string;
  platform: "ios" | "android" | "web";
  created_at: ISODateTime;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      subjects: { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> };
      questions: { Row: Question; Insert: Partial<Question>; Update: Partial<Question> };
      mocks: { Row: Mock; Insert: Partial<Mock>; Update: Partial<Mock> };
      mock_questions: { Row: { mock_id: UUID; question_id: UUID; order_index: number; marks_override: number | null }; Insert: any; Update: any };
      user_uploaded_mocks: { Row: UserUploadedMock; Insert: Partial<UserUploadedMock>; Update: Partial<UserUploadedMock> };
      attempts: { Row: Attempt; Insert: Partial<Attempt>; Update: Partial<Attempt> };
      attempt_answers: { Row: AttemptAnswer; Insert: Partial<AttemptAnswer>; Update: Partial<AttemptAnswer> };
      mock_results: { Row: MockResult; Insert: Partial<MockResult>; Update: Partial<MockResult> };
      rank_thresholds: { Row: RankThreshold; Insert: Partial<RankThreshold>; Update: Partial<RankThreshold> };
      user_progress: { Row: UserProgress; Insert: Partial<UserProgress>; Update: Partial<UserProgress> };
      streak_log: { Row: StreakLogEntry; Insert: Partial<StreakLogEntry>; Update: Partial<StreakLogEntry> };
      xp_transactions: { Row: XpTransaction; Insert: Partial<XpTransaction>; Update: Partial<XpTransaction> };
      penalty_drills: { Row: PenaltyDrill; Insert: Partial<PenaltyDrill>; Update: Partial<PenaltyDrill> };
      notes: { Row: Note; Insert: Partial<Note>; Update: Partial<Note> };
      note_votes: { Row: NoteVote; Insert: Partial<NoteVote>; Update: Partial<NoteVote> };
      push_tokens: { Row: PushToken; Insert: Partial<PushToken>; Update: Partial<PushToken> };
    };
  };
}

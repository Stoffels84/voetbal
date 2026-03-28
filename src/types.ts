export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  totalPoints: number;
  favoriteTeam?: string;
  avatarUrl?: string;
  previousRank?: number;
  rankHistory?: { timestamp: any; rank: number }[];
  topScorer?: string;
}

export interface UserPrivate {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore?: number;
  awayScore?: number;
  firstGoalMinute?: number;
  status: 'scheduled' | 'finished';
  type?: 'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
  group?: string;
  matchNumber?: number; // For bracket positioning
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  firstGoalMinute?: number;
  pointsEarned?: number;
}

export interface League {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  inviteCode: string;
  createdAt: any;
  memberCount: number;
}

export interface LeagueMember {
  id: string;
  leagueId: string;
  userId: string;
  joinedAt: any;
  displayName: string;
  totalPoints: number;
}

export interface BonusQuestion {
  id: string;
  question: string;
  points: number;
  options?: string[]; // For multiple choice
  correctAnswer?: string;
  deadline: string;
  status: 'open' | 'closed' | 'finished';
}

export interface BonusAnswer {
  id: string;
  userId: string;
  questionId: string;
  answer: string;
  pointsEarned?: number;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  results: number[];
  status: 'open' | 'closed';
  createdAt: any;
}

export interface PollVote {
  userId: string;
  pollId: string;
  optionIndex: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  link?: string;
  createdAt: any;
}

export interface TournamentSettings {
  id: string;
  officialTopScorer?: string;
  topScorerPoints?: number;
  topScorerAwarded?: boolean;
}

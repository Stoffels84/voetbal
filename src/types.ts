export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  totalPoints: number;
  favoriteTeam?: string;
  avatarUrl?: string;
  previousRank?: number;
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
  status: 'scheduled' | 'finished';
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  pointsEarned?: number;
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

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: any;
  avatarUrl?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  totalPoints: number;
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

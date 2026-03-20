import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  auth, 
  db, 
  OperationType, 
  handleFirestoreError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  updateDoc, 
  deleteDoc,
  where,
  getDocs,
  writeBatch,
  limit
} from 'firebase/firestore';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Trophy, 
  Calendar, 
  Settings, 
  LogOut, 
  LogIn,
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock,
  User as UserIcon,
  AlertCircle,
  Mail,
  Lock,
  UserPlus,
  ArrowRight,
  Info,
  ShieldCheck
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Match, Prediction, UserProfile, UserPrivate } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Error Boundary Component
class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Er is iets misgegaan.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        errorMessage = `Fout: ${parsed.error} (${parsed.operationType} op ${parsed.path})`;
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-xl font-bold">Oeps!</h2>
            </div>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Probeer opnieuw
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState<UserPrivate | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'predictions' | 'leaderboard' | 'admin' | 'rules'>('predictions');
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);

  // Auth form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get or create user private doc
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(userDocRef);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'users/' + firebaseUser.uid);
          }
          
          let userData: UserPrivate | null = null;
          if (userDoc && !userDoc.exists()) {
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: firebaseUser.email === '29076@delijn.be' ? 'admin' : 'user'
            };
            try {
              await setDoc(userDocRef, userData);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'users/' + firebaseUser.uid);
            }
          } else if (userDoc) {
            userData = userDoc.data() as UserPrivate;
            // Force admin role if email matches but role is not admin
            if (firebaseUser.email === '29076@delijn.be' && userData.role !== 'admin') {
              userData.role = 'admin';
              try {
                await updateDoc(userDocRef, { role: 'admin' });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'users/' + firebaseUser.uid);
              }
            }
          }
          if (userData) setUser(userData);

          // Get or create public profile
          const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
          let profileDoc;
          try {
            profileDoc = await getDoc(profileDocRef);
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, 'profiles/' + firebaseUser.uid);
          }
          
          if (profileDoc && !profileDoc.exists()) {
            const profileData: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anoniem',
              photoURL: firebaseUser.photoURL || null,
              totalPoints: 0
            };
            try {
              await setDoc(profileDocRef, profileData);
              setProfile(profileData);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'profiles/' + firebaseUser.uid);
            }
          } else if (profileDoc) {
            setProfile(profileDoc.data() as UserProfile);
          }
        } catch (error) {
          // Fallback for any other errors in the block
          console.error('Auth listener error:', error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const matchesUnsubscribe = onSnapshot(
      query(collection(db, 'matches'), orderBy('date', 'asc')),
      (snapshot) => {
        setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'matches')
    );

    const predictionsUnsubscribe = onSnapshot(
      query(collection(db, 'predictions'), where('userId', '==', user.uid)),
      (snapshot) => {
        setPredictions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'predictions')
    );

    const leaderboardUnsubscribe = onSnapshot(
      query(collection(db, 'profiles'), orderBy('totalPoints', 'desc'), limit(50)),
      (snapshot) => {
        setLeaderboard(snapshot.docs.map(doc => doc.data() as UserProfile));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'profiles')
    );

    return () => {
      matchesUnsubscribe();
      predictionsUnsubscribe();
      leaderboardUnsubscribe();
    };
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (isResetting) {
        await sendPasswordResetEmail(auth, email);
        setAuthSuccess('Er is een e-mail gestuurd om je wachtwoord te herstellen.');
      } else if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      setAuthError(error.message || "Authenticatie mislukt.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-delijn-yellow"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-stone-100">
          <div className="bg-delijn-yellow/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="text-delijn-black" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-delijn-black text-center mb-2">WK Pronostiek</h1>
          <p className="text-stone-500 text-center mb-8">
            {isResetting ? 'Herstel je wachtwoord.' : isRegistering ? 'Maak een account aan om mee te doen.' : 'Log in om je voorspellingen te bekijken.'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && !isResetting && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input 
                  required
                  type="text"
                  placeholder="Naam"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 pl-12 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                required
                type="email"
                placeholder="E-mailadres"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 pl-12 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow transition-all"
              />
            </div>
            {!isResetting && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input 
                  required
                  type="password"
                  placeholder="Wachtwoord"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 pl-12 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow transition-all"
                />
              </div>
            )}

            {authError && (
              <p className="text-red-500 text-sm font-medium text-center">{authError}</p>
            )}
            {authSuccess && (
              <p className="text-delijn-black text-sm font-bold text-center">{authSuccess}</p>
            )}

            <button 
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 bg-delijn-black text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
              ) : (
                <>
                  {isResetting ? <Mail size={20} /> : isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
                  {isResetting ? 'Stuur herstelmail' : isRegistering ? 'Registreren' : 'Inloggen'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-100 text-center space-y-4">
            {!isResetting && !isRegistering && (
              <button 
                onClick={() => {
                  setIsResetting(true);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors"
              >
                Wachtwoord vergeten?
              </button>
            )}

            {isResetting ? (
              <button 
                onClick={() => {
                  setIsResetting(false);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="text-stone-500 hover:text-delijn-black font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                Terug naar inloggen
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="text-stone-500 hover:text-delijn-black font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                {isRegistering ? 'Heb je al een account? Log in' : 'Nog geen account? Registreer hier'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-delijn-black font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-delijn-yellow p-2 rounded-xl">
              <Trophy className="text-delijn-black" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">WK Pronostiek</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{profile?.displayName}</p>
              <p className="text-xs text-stone-500 font-semibold">{profile?.totalPoints} punten</p>
            </div>
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-stone-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
                <UserIcon size={20} className="text-stone-500" />
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-red-600 transition-colors"
              title="Uitloggen"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="max-w-4xl mx-auto px-4 flex border-t border-stone-100">
          <TabButton 
            active={activeTab === 'predictions'} 
            onClick={() => setActiveTab('predictions')}
            icon={<Calendar size={18} />}
            label="Voorspellingen"
          />
          <TabButton 
            active={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')}
            icon={<Trophy size={18} />}
            label="Klassement"
          />
          <TabButton 
            active={activeTab === 'rules'} 
            onClick={() => setActiveTab('rules')}
            icon={<Info size={18} />}
            label="Regels"
          />
          {user.role === 'admin' && (
            <TabButton 
              active={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')}
              icon={<Settings size={18} />}
              label="Beheer"
            />
          )}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'predictions' && (
          <PredictionsView matches={matches} predictions={predictions} userId={user.uid} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView leaderboard={leaderboard} currentUserId={user.uid} />
        )}
        {activeTab === 'rules' && (
          <RulesView />
        )}
        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminView matches={matches} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2",
        active ? "border-delijn-yellow text-delijn-black bg-delijn-yellow/10" : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PredictionsView({ matches, predictions, userId }: { matches: Match[]; predictions: Prediction[]; userId: string }) {
  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Clock className="text-delijn-black" size={24} />
          Komende Wedstrijden
        </h2>
        {upcomingMatches.length === 0 ? (
          <EmptyState message="Geen komende wedstrijden gevonden." />
        ) : (
          <div className="grid gap-4">
            {upcomingMatches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                prediction={predictions.find(p => p.matchId === match.id)}
                userId={userId}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <CheckCircle2 className="text-stone-400" size={24} />
          Gespeelde Wedstrijden
        </h2>
        {finishedMatches.length === 0 ? (
          <EmptyState message="Nog geen wedstrijden gespeeld." />
        ) : (
          <div className="grid gap-4">
            {finishedMatches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                prediction={predictions.find(p => p.matchId === match.id)}
                userId={userId}
                readonly
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const MatchCard: React.FC<{ match: Match; prediction?: Prediction; userId: string; readonly?: boolean }> = ({ match, prediction, userId, readonly }) => {
  const [homeScore, setHomeScore] = useState(prediction?.homeScore?.toString() || '');
  const [awayScore, setAwayScore] = useState(prediction?.awayScore?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') return;
    setSaving(true);
    try {
      const predData = {
        userId,
        matchId: match.id,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
      };

      if (prediction) {
        await updateDoc(doc(db, 'predictions', prediction.id), predData);
      } else {
        const newPredRef = doc(collection(db, 'predictions'));
        await setDoc(newPredRef, { id: newPredRef.id, ...predData });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'predictions');
    } finally {
      setSaving(false);
    }
  };

  const isSaved = prediction && 
    prediction.homeScore.toString() === homeScore && 
    prediction.awayScore.toString() === awayScore;

  return (
    <div className={cn(
      "bg-white p-6 rounded-2xl border border-stone-200 shadow-sm transition-all",
      readonly && "opacity-80 grayscale-[0.5]"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">
            {format(new Date(match.date), 'EEEE d MMMM HH:mm', { locale: nl })}
          </p>
          <div className="flex items-center gap-4 text-lg font-bold">
            <span className="flex-1 text-right">{match.homeTeam}</span>
            <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-lg min-w-[60px] justify-center">
              {match.status === 'finished' ? (
                <span className="text-delijn-black font-black">{match.homeScore} - {match.awayScore}</span>
              ) : (
                <span className="text-stone-400">vs</span>
              )}
            </div>
            <span className="flex-1">{match.awayTeam}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={readonly || saving}
              className="w-12 h-12 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none disabled:opacity-50"
              placeholder="?"
            />
            <span className="text-stone-400 font-bold">-</span>
            <input 
              type="number" 
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={readonly || saving}
              className="w-12 h-12 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none disabled:opacity-50"
              placeholder="?"
            />
          </div>
          
          {!readonly && (
            <button 
              onClick={handleSave}
              disabled={saving || isSaved || homeScore === '' || awayScore === ''}
              className={cn(
                "px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2",
                isSaved 
                  ? "bg-delijn-yellow text-delijn-black cursor-default" 
                  : "bg-delijn-black text-white hover:bg-stone-800 active:scale-95 disabled:opacity-50"
              )}
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : isSaved ? <CheckCircle2 size={18} /> : 'Opslaan'}
            </button>
          )}

          {readonly && prediction && (
            <div className="flex flex-col items-end">
              <p className="text-xs font-bold text-stone-400 uppercase">Jouw gok</p>
              <p className="font-bold text-stone-600">{prediction.homeScore} - {prediction.awayScore}</p>
              {prediction.pointsEarned !== undefined && (
                <p className="text-sm font-bold text-delijn-black">+{prediction.pointsEarned} ptn</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RulesView() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Trophy className="text-delijn-black" size={32} />
          Puntentelling Pronostiek
        </h2>
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="bg-delijn-yellow text-delijn-black w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-lg shadow-delijn-yellow/20">
                  5
                </div>
                <div>
                  <h3 className="text-xl font-bold text-delijn-black">Correcte Uitslag</h3>
                  <p className="text-stone-500">Je hebt de exacte score van de wedstrijd juist voorspeld.</p>
                </div>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="flex items-center gap-6">
                <div className="bg-stone-100 text-delijn-black w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold text-delijn-black">Correcte Winnaar / Gelijkspel</h3>
                  <p className="text-stone-500">Je hebt de winnaar of een gelijkspel juist voorspeld, maar niet de exacte score.</p>
                </div>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="flex items-center gap-6">
                <div className="bg-stone-50 text-stone-400 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0">
                  0
                </div>
                <div>
                  <h3 className="text-xl font-bold text-delijn-black">Foutieve Voorspelling</h3>
                  <p className="text-stone-500">Je hebt noch de winnaar, noch de score juist voorspeld.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-stone-50 p-6 border-t border-stone-100">
            <p className="text-sm text-stone-500 italic">
              * Punten worden automatisch berekend zodra de admin de officiële uitslag invoert.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function LeaderboardView({ leaderboard, currentUserId }: { leaderboard: UserProfile[]; currentUserId: string }) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-stone-100 bg-stone-50/50">
        <h2 className="text-xl font-bold">Top Voorspellers</h2>
      </div>
      <div className="divide-y divide-stone-100">
        {leaderboard.length === 0 ? (
          <div className="p-10 text-center text-stone-400">Nog geen scores beschikbaar.</div>
        ) : (
          leaderboard.map((entry, index) => (
            <div 
              key={entry.uid} 
              className={cn(
                "flex items-center gap-4 p-4 transition-colors",
                entry.uid === currentUserId ? "bg-delijn-yellow/10" : "hover:bg-stone-50"
              )}
            >
              <div className="w-8 text-center font-bold text-stone-400">
                {index + 1}
              </div>
              {entry.photoURL ? (
                <img src={entry.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
                  <UserIcon size={18} className="text-stone-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-delijn-black">
                  {entry.displayName}
                  {entry.uid === currentUserId && <span className="ml-2 text-[10px] bg-delijn-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Jij</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-delijn-black">{entry.totalPoints}</p>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Punten</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminView({ matches }: { matches: Match[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const matchData = {
        homeTeam,
        awayTeam,
        date: new Date(date).toISOString(),
        status: 'scheduled' as const,
      };
      const docRef = doc(collection(db, 'matches'));
      await setDoc(docRef, { id: docRef.id, ...matchData });
      setIsAdding(false);
      setHomeTeam('');
      setAwayTeam('');
      setDate('');
      setSuccess('Match succesvol toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateResult = async (match: Match, home: number, away: number) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Update match
      const matchRef = doc(db, 'matches', match.id);
      batch.update(matchRef, {
        homeScore: home,
        awayScore: away,
        status: 'finished'
      });

      // 2. Calculate points for all predictions for this match
      const predsQuery = query(collection(db, 'predictions'), where('matchId', '==', match.id));
      const predsSnapshot = await getDocs(predsQuery);
      
      const userPointsDelta: Record<string, number> = {};

      predsSnapshot.docs.forEach(predDoc => {
        const pred = predDoc.data() as Prediction;
        let points = 0;
        
        // Logic: 
        // Correct score: 5 points
        // Correct winner/draw: 2 points
        // Otherwise: 0 points
        
        const actualWinner = home > away ? 'home' : home < away ? 'away' : 'draw';
        const predWinner = pred.homeScore > pred.awayScore ? 'home' : pred.homeScore < pred.awayScore ? 'away' : 'draw';

        if (pred.homeScore === home && pred.awayScore === away) {
          points = 5;
        } else if (actualWinner === predWinner) {
          points = 2;
        }

        const oldPoints = pred.pointsEarned || 0;
        const delta = points - oldPoints;

        if (delta !== 0) {
          batch.update(doc(db, 'predictions', predDoc.id), { pointsEarned: points });
          userPointsDelta[pred.userId] = (userPointsDelta[pred.userId] || 0) + delta;
        }
      });

      // 3. Update user total points
      for (const [userId, delta] of Object.entries(userPointsDelta)) {
        const profileRef = doc(db, 'profiles', userId);
        const profileDoc = await getDoc(profileRef);
        if (profileDoc.exists()) {
          const currentPoints = profileDoc.data().totalPoints || 0;
          batch.update(profileRef, { totalPoints: currentPoints + delta });
        }
      }

      await batch.commit();
      setSuccess('Uitslag opgeslagen en punten berekend!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-update-results');
    }
  };

  const handleRecalculateAll = async () => {
    if (!confirm('Wil je alle scores opnieuw berekenen? Dit kan even duren.')) return;
    setSaving(true);
    try {
      const finishedMatches = matches.filter(m => m.status === 'finished');
      const profilesSnapshot = await getDocs(collection(db, 'profiles'));
      const userPoints: Record<string, number> = {};
      profilesSnapshot.docs.forEach(d => userPoints[d.id] = 0);

      const predsSnapshot = await getDocs(collection(db, 'predictions'));
      const batch = writeBatch(db);
      
      predsSnapshot.docs.forEach(predDoc => {
        const pred = predDoc.data() as Prediction;
        const match = finishedMatches.find(m => m.id === pred.matchId);
        
        let points = 0;
        if (match && match.homeScore !== undefined && match.awayScore !== undefined) {
          const actualWinner = match.homeScore > match.awayScore ? 'home' : match.homeScore < match.awayScore ? 'away' : 'draw';
          const predWinner = pred.homeScore > pred.awayScore ? 'home' : pred.homeScore < pred.awayScore ? 'away' : 'draw';

          if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) {
            points = 5;
          } else if (actualWinner === predWinner) {
            points = 2;
          }
        }
        
        batch.update(doc(db, 'predictions', predDoc.id), { pointsEarned: points });
        userPoints[pred.userId] = (userPoints[pred.userId] || 0) + points;
      });

      for (const [userId, points] of Object.entries(userPoints)) {
        batch.update(doc(db, 'profiles', userId), { totalPoints: points });
      }

      await batch.commit();
      setSuccess('Alle scores zijn opnieuw berekend!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'recalculate-all');
    } finally {
      setSaving(false);
    }
  };

  const handleResetMatch = async (matchId: string) => {
    if (!confirm('Match terugzetten naar gepland? Scores worden niet automatisch verwijderd uit klassement.')) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'scheduled',
        homeScore: null,
        awayScore: null
      });
      setSuccess('Match is gereset naar gepland.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reset-match');
    }
  };

  const handleDeleteMatch = async (id: string) => {
    if (!confirm('Match verwijderen?')) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'matches');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Wedstrijdbeheer</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRecalculateAll}
            disabled={saving}
            className="flex items-center gap-2 bg-stone-100 text-stone-600 px-4 py-2 rounded-xl font-bold hover:bg-stone-200 transition-all disabled:opacity-50"
            title="Herbereken alle scores voor alle gebruikers"
          >
            <Trophy size={18} />
            Herbereken Alles
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-delijn-yellow text-delijn-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 transition-all"
          >
            <Plus size={20} />
            Nieuwe Match
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-delijn-yellow/10 border border-delijn-yellow/20 text-delijn-black p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in">
          <CheckCircle2 size={20} />
          <p className="font-bold">{success}</p>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddMatch} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Thuisploeg</label>
              <input 
                required
                value={homeTeam}
                onChange={e => setHomeTeam(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
                placeholder="Bijv. België"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Uitploeg</label>
              <input 
                required
                value={awayTeam}
                onChange={e => setAwayTeam(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
                placeholder="Bijv. Frankrijk"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Datum & Tijd</label>
              <input 
                required
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-stone-500 font-bold">Annuleren</button>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-delijn-black text-white px-6 py-2 rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {matches.map(match => (
          <AdminMatchCard 
            key={match.id} 
            match={match} 
            onUpdate={handleUpdateResult} 
            onDelete={handleDeleteMatch}
            onReset={handleResetMatch}
          />
        ))}
      </div>
    </div>
  );
}

const AdminMatchCard: React.FC<{ 
  match: Match; 
  onUpdate: (m: Match, h: number, a: number) => void; 
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}> = ({ match, onUpdate, onDelete, onReset }) => {
  const [h, setH] = useState(match.homeScore?.toString() || '');
  const [a, setA] = useState(match.awayScore?.toString() || '');
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (h === '' || a === '') return;
    setUpdating(true);
    await onUpdate(match, parseInt(h), parseInt(a));
    setUpdating(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-xs font-bold text-stone-400 mb-1">{format(new Date(match.date), 'd MMM yyyy HH:mm')}</p>
        <p className="font-bold text-lg">{match.homeTeam} vs {match.awayTeam}</p>
        <div className="flex items-center gap-3 mt-1">
          <p className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", match.status === 'finished' ? "bg-delijn-yellow text-delijn-black" : "bg-amber-100 text-amber-700")}>
            {match.status === 'finished' ? 'Afgelopen' : 'Gepland'}
          </p>
          {match.status === 'finished' && (
            <button 
              onClick={() => onReset(match.id)}
              className="text-[10px] font-bold text-stone-400 hover:text-stone-600 underline"
            >
              Reset naar gepland
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={h} 
            onChange={e => setH(e.target.value)}
            className="w-12 h-12 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none"
            placeholder="H"
          />
          <span className="text-stone-400">-</span>
          <input 
            type="number" 
            value={a} 
            onChange={e => setA(e.target.value)}
            className="w-12 h-12 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none"
            placeholder="A"
          />
        </div>
        
        <button 
          onClick={handleUpdate}
          disabled={updating || h === '' || a === ''}
          className="bg-delijn-black text-white px-4 py-2 rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50"
        >
          {updating ? '...' : 'Uitslag'}
        </button>

        <button 
          onClick={() => onDelete(match.id)}
          className="p-2 text-stone-300 hover:text-red-600 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white p-12 rounded-3xl border border-dashed border-stone-300 text-center">
      <p className="text-stone-400 font-medium">{message}</p>
    </div>
  );
}

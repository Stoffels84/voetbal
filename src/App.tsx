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
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  Timer,
  Camera,
  Bell,
  BarChart3,
  Vote,
  Smartphone
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Match, Prediction, UserProfile, UserPrivate, BonusQuestion, BonusAnswer, Message, Poll, PollVote, AppNotification } from './types';
import { 
  addDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';

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
  const [activeTab, setActiveTab] = useState<'predictions' | 'leaderboard' | 'admin' | 'rules' | 'bonus' | 'chat' | 'settings' | 'polls'>('predictions');
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestion[]>([]);
  const [bonusAnswers, setBonusAnswers] = useState<BonusAnswer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
              role: firebaseUser.email === 'christoffrotty84@gmail.com' ? 'admin' : 'user'
            };
            try {
              await setDoc(userDocRef, userData);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'users/' + firebaseUser.uid);
            }
          } else if (userDoc) {
            userData = userDoc.data() as UserPrivate;
            // Force admin role if email matches but role is not admin
            if (firebaseUser.email === 'christoffrotty84@gmail.com' && userData.role !== 'admin') {
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
      collection(db, 'predictions'),
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

    const bonusQuestionsUnsubscribe = onSnapshot(
      query(collection(db, 'bonusQuestions'), orderBy('deadline', 'asc')),
      (snapshot) => {
        setBonusQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BonusQuestion)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bonusQuestions')
    );

    const bonusAnswersUnsubscribe = onSnapshot(
      query(collection(db, 'bonusAnswers'), where('userId', '==', user.uid)),
      (snapshot) => {
        setBonusAnswers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BonusAnswer)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bonusAnswers')
    );

    const messagesUnsubscribe = onSnapshot(
      query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse());
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'messages')
    );

    const pollsUnsubscribe = onSnapshot(
      query(collection(db, 'polls'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setPolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'polls')
    );

    const pollVotesUnsubscribe = onSnapshot(
      query(collection(db, 'pollVotes'), where('userId', '==', user.uid)),
      (snapshot) => {
        setPollVotes(snapshot.docs.map(doc => doc.data() as PollVote));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'pollVotes')
    );

    const notificationsUnsubscribe = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20)),
      (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );

    return () => {
      matchesUnsubscribe();
      predictionsUnsubscribe();
      leaderboardUnsubscribe();
      bonusQuestionsUnsubscribe();
      bonusAnswersUnsubscribe();
      messagesUnsubscribe();
      pollsUnsubscribe();
      pollVotesUnsubscribe();
      notificationsUnsubscribe();
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
      let message = "Authenticatie mislukt.";
      
      if (error.code === 'auth/invalid-credential') {
        message = "Onjuiste e-mail of wachtwoord.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Te veel mislukte pogingen. Probeer het later opnieuw.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Dit e-mailadres is al in gebruik.";
      } else if (error.code === 'auth/weak-password') {
        message = "Het wachtwoord is te zwak.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Ongeldig e-mailadres.";
      } else if (error.message) {
        message = error.message;
      }
      
      setAuthError(message);
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
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-stone-100" />
            ) : profile?.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-stone-100" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
                <UserIcon size={20} className="text-stone-500" />
              </div>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 transition-colors relative", 
                  showNotifications ? "text-delijn-black" : "text-stone-400 hover:text-delijn-black"
                )}
                title="Notificaties"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl border border-stone-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Notificaties</h3>
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={async () => {
                          const unread = notifications.filter(n => !n.read);
                          for (const n of unread) {
                            await updateDoc(doc(db, 'notifications', n.id), { read: true });
                          }
                        }}
                        className="text-[10px] font-black text-delijn-black uppercase hover:underline"
                      >
                        Alles gelezen
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={32} className="mx-auto text-stone-200 mb-2" />
                        <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Geen meldingen</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={cn(
                            "p-4 border-b border-stone-50 last:border-0 transition-colors cursor-pointer hover:bg-stone-50",
                            !notification.read && "bg-delijn-yellow/5"
                          )}
                          onClick={async () => {
                            if (!notification.read) {
                              await updateDoc(doc(db, 'notifications', notification.id), { read: true });
                            }
                            if (notification.link) {
                              setActiveTab(notification.link as any);
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className="flex gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              "bg-stone-100 text-stone-500"
                            )}>
                              <Info size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold leading-tight mb-1">{notification.title}</p>
                              <p className="text-xs text-stone-500 leading-tight">{notification.message}</p>
                              <p className="text-[10px] text-stone-400 mt-2 font-bold uppercase tracking-widest">
                                {format(new Date(notification.createdAt), 'd MMM HH:mm', { locale: nl })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setActiveTab('settings')}
              className={cn("p-2 transition-colors", activeTab === 'settings' ? "text-delijn-black" : "text-stone-400 hover:text-delijn-black")}
              title="Instellingen"
            >
              <Settings size={20} />
            </button>
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
        <nav className="max-w-4xl mx-auto px-4 flex border-t border-stone-100 overflow-x-auto no-scrollbar">
          <TabButton 
            active={activeTab === 'predictions'} 
            onClick={() => setActiveTab('predictions')}
            icon={<Calendar size={18} />}
            label="Pronos"
          />
          <TabButton 
            active={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')}
            icon={<Trophy size={18} />}
            label="Klassement"
          />
          <TabButton 
            active={activeTab === 'bonus'} 
            onClick={() => setActiveTab('bonus')}
            icon={<HelpCircle size={18} />}
            label="Bonus"
          />
          <TabButton 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')}
            icon={<MessageSquare size={18} />}
            label="Chat"
          />
          <TabButton 
            active={activeTab === 'polls'} 
            onClick={() => setActiveTab('polls')}
            icon={<BarChart3 size={18} />}
            label="Polls"
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
              icon={<ShieldCheck size={18} />}
              label="Beheer"
            />
          )}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <CountdownTimer matches={matches} />

        {activeTab === 'predictions' && (
          <PredictionsView matches={matches} predictions={predictions} userId={user.uid} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView leaderboard={leaderboard} currentUserId={user.uid} />
        )}
        {activeTab === 'bonus' && (
          <BonusQuestionsView questions={bonusQuestions} answers={bonusAnswers} userId={user.uid} />
        )}
        {activeTab === 'chat' && (
          <ChatBox messages={messages} user={user} profile={profile} />
        )}
        {activeTab === 'polls' && (
          <PollsView polls={polls} pollVotes={pollVotes} userId={user.uid} />
        )}
        {activeTab === 'rules' && (
          <RulesView />
        )}
        {activeTab === 'settings' && (
          <SettingsView profile={profile} user={user} />
        )}
        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminView matches={matches} bonusQuestions={bonusQuestions} polls={polls} />
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
                prediction={predictions.find(p => p.matchId === match.id && p.userId === userId)}
                userId={userId}
                allPredictions={predictions}
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
                prediction={predictions.find(p => p.matchId === match.id && p.userId === userId)}
                userId={userId}
                readonly
                allPredictions={predictions}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const MatchCard: React.FC<{ 
  match: Match; 
  prediction?: Prediction; 
  userId: string; 
  readonly?: boolean;
  allPredictions?: Prediction[];
}> = ({ match, prediction, userId, readonly, allPredictions = [] }) => {
  const [homeScore, setHomeScore] = useState(prediction?.homeScore?.toString() || '');
  const [awayScore, setAwayScore] = useState(prediction?.awayScore?.toString() || '');
  const [saving, setSaving] = useState(false);

  const matchPredictions = allPredictions.filter(p => p.matchId === match.id);
  const totalPredictions = matchPredictions.length;
  
  const stats = {
    home: matchPredictions.filter(p => p.homeScore > p.awayScore).length,
    draw: matchPredictions.filter(p => p.homeScore === p.awayScore).length,
    away: matchPredictions.filter(p => p.homeScore < p.awayScore).length,
  };

  const getPercent = (count: number) => totalPredictions > 0 ? Math.round((count / totalPredictions) * 100) : 0;

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
      "bg-white p-6 rounded-2xl border border-stone-200 shadow-sm transition-all flex flex-col gap-6",
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

      {totalPredictions > 0 && (
        <div className="pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
              <BarChart3 size={12} />
              Community Voorspellingen ({totalPredictions})
            </p>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-stone-100">
            <div 
              className="bg-delijn-black transition-all duration-500" 
              style={{ width: `${getPercent(stats.home)}%` }}
              title={`Winst ${match.homeTeam}: ${getPercent(stats.home)}%`}
            />
            <div 
              className="bg-stone-300 transition-all duration-500" 
              style={{ width: `${getPercent(stats.draw)}%` }}
              title={`Gelijkspel: ${getPercent(stats.draw)}%`}
            />
            <div 
              className="bg-delijn-yellow transition-all duration-500" 
              style={{ width: `${getPercent(stats.away)}%` }}
              title={`Winst ${match.awayTeam}: ${getPercent(stats.away)}%`}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-bold text-stone-500">
            <span>{match.homeTeam} {getPercent(stats.home)}%</span>
            <span>Gelijk {getPercent(stats.draw)}%</span>
            <span>{match.awayTeam} {getPercent(stats.away)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PollsView({ polls, pollVotes, userId }: { polls: Poll[]; pollVotes: PollVote[]; userId: string }) {
  const handleVote = async (pollId: string, optionIndex: number) => {
    try {
      const voteRef = doc(db, 'pollVotes', `${userId}_${pollId}`);
      await setDoc(voteRef, {
        userId,
        pollId,
        optionIndex,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pollVotes');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold flex items-center gap-3">
        <BarChart3 className="text-delijn-black" size={32} />
        Polls & Vragen
      </h2>

      <div className="grid gap-6">
        {polls.map(poll => {
          const userVote = pollVotes.find(v => v.pollId === poll.id);
          const totalVotes = poll.results?.reduce((a, b) => a + b, 0) || 0;

          return (
            <div key={poll.id} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
              <h3 className="text-xl font-bold mb-6">{poll.question}</h3>
              <div className="space-y-3">
                {poll.options.map((option, idx) => {
                  const votes = poll.results?.[idx] || 0;
                  const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isSelected = userVote?.optionIndex === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => !userVote && handleVote(poll.id, idx)}
                      disabled={!!userVote}
                      className={cn(
                        "w-full relative h-14 rounded-2xl border transition-all overflow-hidden group",
                        isSelected 
                          ? "border-delijn-yellow bg-delijn-yellow/5" 
                          : userVote 
                            ? "border-stone-100 bg-stone-50" 
                            : "border-stone-200 hover:border-delijn-yellow hover:bg-stone-50"
                      )}
                    >
                      {userVote && (
                        <div 
                          className={cn(
                            "absolute inset-y-0 left-0 transition-all duration-1000",
                            isSelected ? "bg-delijn-yellow/20" : "bg-stone-200/50"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      )}
                      <div className="absolute inset-0 px-6 flex items-center justify-between font-bold">
                        <span className={cn(
                          "transition-colors",
                          isSelected ? "text-delijn-black" : "text-stone-600"
                        )}>
                          {option}
                        </span>
                        {userVote && (
                          <span className="text-stone-400 text-sm">{percent}%</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {userVote && (
                <p className="mt-4 text-xs font-bold text-stone-400 text-center uppercase tracking-widest">
                  Bedankt voor je stem!
                </p>
              )}
            </div>
          );
        })}
      </div>

      {polls.length === 0 && (
        <EmptyState message="Geen actieve polls op dit moment." />
      )}
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
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold text-delijn-black">Correcte Uitslag</h3>
                  <p className="text-stone-500">Je hebt de exacte score van de wedstrijd juist voorspeld.</p>
                </div>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="flex items-center gap-6">
                <div className="bg-stone-100 text-delijn-black w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0">
                  1
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
      <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
        <h2 className="text-xl font-bold">Top Voorspellers</h2>
        <div className="flex items-center gap-2 text-xs text-stone-400 font-bold uppercase tracking-widest">
          <TrendingUp size={14} className="text-green-500" />
          <span>Vorm</span>
        </div>
      </div>
      <div className="divide-y divide-stone-100">
        {leaderboard.length === 0 ? (
          <div className="p-10 text-center text-stone-400">Nog geen scores beschikbaar.</div>
        ) : (
          leaderboard.map((entry, index) => {
            const rank = index + 1;
            const prevRank = entry.previousRank;
            let rankIcon = <Minus size={14} className="text-stone-300" />;
            
            if (prevRank) {
              if (rank < prevRank) rankIcon = <TrendingUp size={14} className="text-green-500" />;
              else if (rank > prevRank) rankIcon = <TrendingDown size={14} className="text-red-500" />;
            }

            return (
              <div 
                key={entry.uid} 
                className={cn(
                  "flex items-center gap-4 p-4 transition-colors",
                  entry.uid === currentUserId ? "bg-delijn-yellow/10" : "hover:bg-stone-50"
                )}
              >
                <div className="w-8 flex flex-col items-center">
                  <span className="font-bold text-stone-400">{rank}</span>
                  {rankIcon}
                </div>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="w-10 h-10 rounded-full border border-stone-100" />
                ) : entry.photoURL ? (
                  <img src={entry.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
                    <UserIcon size={18} className="text-stone-500" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-delijn-black">{entry.displayName}</p>
                    {entry.favoriteTeam && (
                      <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                        {entry.favoriteTeam}
                      </span>
                    )}
                  </div>
                  {entry.uid === currentUserId && <span className="text-[10px] bg-delijn-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Jij</span>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-delijn-black">{entry.totalPoints}</p>
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Punten</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AdminView({ matches, bonusQuestions, polls }: { matches: Match[]; bonusQuestions: BonusQuestion[]; polls: Poll[] }) {
  const [adminTab, setAdminTab] = useState<'matches' | 'bonus' | 'polls'>('matches');
  const [isAdding, setIsAdding] = useState(false);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
        // Correct score: 3 points
        // Correct winner/draw: 1 point
        // Otherwise: 0 points
        
        const actualWinner = home > away ? 'home' : home < away ? 'away' : 'draw';
        const predWinner = pred.homeScore > pred.awayScore ? 'home' : pred.homeScore < pred.awayScore ? 'away' : 'draw';

        if (pred.homeScore === home && pred.awayScore === away) {
          points = 3;
        } else if (actualWinner === predWinner) {
          points = 1;
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
    setConfirmAction({
      title: 'Scores herberekenen',
      message: 'Wil je alle scores opnieuw berekenen? Dit kan even duren.',
      onConfirm: async () => {
        setConfirmAction(null);
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
                points = 3;
              } else if (actualWinner === predWinner) {
                points = 1;
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
      }
    });
  };

  const handleResetMatch = async (matchId: string) => {
    setConfirmAction({
      title: 'Match resetten',
      message: 'Match terugzetten naar gepland? Scores worden niet automatisch verwijderd uit klassement.',
      onConfirm: async () => {
        setConfirmAction(null);
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
      }
    });
  };

  const handleDeleteMatch = async (id: string) => {
    setConfirmAction({
      title: 'Match verwijderen',
      message: 'Weet je zeker dat je deze match wilt verwijderen?',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await deleteDoc(doc(db, 'matches', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'matches');
        }
      }
    });
  };
  return (
    <div className="space-y-8">
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setAdminTab('matches')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            adminTab === 'matches' ? "bg-delijn-black text-white" : "bg-white text-stone-500 border border-stone-200"
          )}
        >
          <Calendar size={18} />
          Wedstrijden
        </button>
        <button 
          onClick={() => setAdminTab('bonus')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            adminTab === 'bonus' ? "bg-delijn-black text-white" : "bg-white text-stone-500 border border-stone-200"
          )}
        >
          <HelpCircle size={18} />
          Bonusvragen
        </button>
        <button 
          onClick={() => setAdminTab('polls')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            adminTab === 'polls' ? "bg-delijn-black text-white" : "bg-white text-stone-500 border border-stone-200"
          )}
        >
          <BarChart3 size={18} />
          Polls
        </button>
      </div>

      {adminTab === 'matches' ? (
        <>
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

          {confirmAction && (
            <ConfirmationModal 
              title={confirmAction.title}
              message={confirmAction.message}
              onConfirm={confirmAction.onConfirm}
              onCancel={() => setConfirmAction(null)}
            />
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
        </>
      ) : adminTab === 'bonus' ? (
        <AdminBonusQuestionsView questions={bonusQuestions} />
      ) : (
        <AdminPollsView polls={polls} />
      )}
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

function CountdownTimer({ matches }: { matches: Match[] }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const upcoming = matches
        .filter(m => m.status === 'scheduled' && new Date(m.date).getTime() > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (upcoming.length > 0) {
        const next = upcoming[0];
        setNextMatch(next);
        const distance = new Date(next.date).getTime() - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}u ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(null);
        setNextMatch(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [matches]);

  if (!timeLeft || !nextMatch) return null;

  return (
    <div className="bg-delijn-black text-white p-4 rounded-3xl mb-8 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-delijn-yellow/20 p-2 rounded-xl">
          <Timer className="text-delijn-yellow" size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Volgende wedstrijd</p>
          <p className="font-bold text-sm">{nextMatch.homeTeam} vs {nextMatch.awayTeam}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Aftellen</p>
        <p className="font-mono font-bold text-delijn-yellow">{timeLeft}</p>
      </div>
    </div>
  );
}

function ChatBox({ messages, user, profile }: { messages: Message[]; user: UserPrivate; profile: UserProfile | null }) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        userName: profile?.displayName || 'Anoniem',
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
        avatarUrl: profile?.avatarUrl || null
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="text-delijn-black" size={24} />
          Berichtenmuur
        </h2>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-400 italic">
            Nog geen berichten. Wees de eerste!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col", msg.userId === user.uid ? "items-end" : "items-start")}>
              <div className={cn("max-w-[80%] rounded-2xl p-3 shadow-sm", 
                msg.userId === user.uid ? "bg-delijn-black text-white rounded-tr-none" : "bg-stone-100 text-delijn-black rounded-tl-none")}>
                <div className="flex items-center gap-2 mb-1">
                  {msg.avatarUrl && <img src={msg.avatarUrl} alt="" className="w-4 h-4 rounded-full" />}
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{msg.userName}</span>
                </div>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-100 bg-stone-50 flex gap-2">
        <input 
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Typ een bericht..."
          className="flex-1 bg-white border border-stone-200 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
        />
        <button 
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-delijn-black text-white p-2 rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-all"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

function BonusQuestionsView({ questions, answers, userId }: { questions: BonusQuestion[]; answers: BonusAnswer[]; userId: string }) {
  const handleAnswer = async (questionId: string, answer: string) => {
    const existing = answers.find(a => a.questionId === questionId);
    if (existing) {
      await updateDoc(doc(db, 'bonusAnswers', existing.id), { answer });
    } else {
      await addDoc(collection(db, 'bonusAnswers'), {
        userId,
        questionId,
        answer,
        pointsEarned: 0
      });
    }
  };

  const openQuestions = questions.filter(q => q.status === 'open');
  const finishedQuestions = questions.filter(q => q.status !== 'open');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HelpCircle className="text-delijn-black" size={28} />
          Bonusvragen
        </h2>
        
        {openQuestions.length === 0 ? (
          <EmptyState message="Geen open bonusvragen op dit moment." />
        ) : (
          <div className="grid gap-6">
            {openQuestions.map(q => {
              const userAnswer = answers.find(a => a.questionId === q.id)?.answer;
              const isExpired = new Date(q.deadline) < new Date();

              return (
                <div key={q.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-delijn-black">{q.question}</h3>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">
                        Deadline: {format(new Date(q.deadline), 'd MMM HH:mm')}
                      </p>
                    </div>
                    <div className="bg-delijn-yellow text-delijn-black px-3 py-1 rounded-full text-xs font-black">
                      +{q.points} PNT
                    </div>
                  </div>

                  {q.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          disabled={isExpired}
                          onClick={() => handleAnswer(q.id, opt)}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left",
                            userAnswer === opt 
                              ? "bg-delijn-black text-white border-delijn-black" 
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:border-delijn-yellow"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input 
                      type="text"
                      disabled={isExpired}
                      placeholder="Typ je antwoord..."
                      value={userAnswer || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
                    />
                  )}
                  {isExpired && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-3">Deadline verstreken</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {finishedQuestions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 text-stone-400">Afgesloten Bonusvragen</h2>
          <div className="grid gap-4 opacity-70">
            {finishedQuestions.map(q => {
              const userAnswer = answers.find(a => a.questionId === q.id);
              const isCorrect = userAnswer?.answer === q.correctAnswer;

              return (
                <div key={q.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{q.question}</p>
                    <p className="text-xs text-stone-400">Correct antwoord: <span className="text-delijn-black">{q.correctAnswer || 'Nog niet bekend'}</span></p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xs font-black uppercase tracking-widest", isCorrect ? "text-green-600" : "text-red-500")}>
                      {userAnswer ? (isCorrect ? `+${q.points} PNT` : '0 PNT') : 'Niet ingevuld'}
                    </p>
                    <p className="text-[10px] text-stone-400 italic">Jouw antwoord: {userAnswer?.answer || '-'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SettingsView({ profile, user }: { profile: UserProfile | null; user: UserPrivate }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [favoriteTeam, setFavoriteTeam] = useState(profile?.favoriteTeam || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const teams = [
    "België", "Nederland", "Frankrijk", "Duitsland", "Spanje", "Portugal", "Engeland", "Italië", "Brazilië", "Argentinië"
  ];

  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ruby",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Toby"
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        displayName,
        favoriteTeam,
        avatarUrl
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Settings className="text-delijn-black" size={28} />
          Profiel Instellingen
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Display Naam</label>
            <input 
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Favoriete Ploeg</label>
            <select 
              value={favoriteTeam}
              onChange={e => setFavoriteTeam(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
            >
              <option value="">Kies een ploeg...</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Kies je Avatar</label>
            <div className="grid grid-cols-4 gap-4">
              {avatars.map(url => (
                <button
                  key={url}
                  onClick={() => setAvatarUrl(url)}
                  className={cn(
                    "relative rounded-2xl overflow-hidden border-2 transition-all p-1",
                    avatarUrl === url ? "border-delijn-yellow bg-delijn-yellow/10" : "border-transparent hover:border-stone-200"
                  )}
                >
                  <img src={url} alt="Avatar" className="w-full aspect-square rounded-xl" />
                  {avatarUrl === url && (
                    <div className="absolute top-1 right-1 bg-delijn-yellow text-delijn-black rounded-full p-0.5">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-delijn-black text-white py-4 rounded-2xl font-bold hover:bg-stone-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving ? 'Bezig met opslaan...' : success ? 'Opgeslagen!' : 'Instellingen Opslaan'}
            {success && <CheckCircle2 size={20} />}
          </button>
        </div>
      </section>
    </div>
  );
}

function AdminPollsView({ polls }: { polls: Poll[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(collection(db, 'polls'));
      await setDoc(docRef, {
        id: docRef.id,
        question,
        options: options.filter(o => o.trim() !== ''),
        results: options.filter(o => o.trim() !== '').map(() => 0),
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setQuestion('');
      setOptions(['', '']);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'polls');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze poll wilt verwijderen?')) return;
    try {
      await deleteDoc(doc(db, 'polls', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'polls');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pollbeheer</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-delijn-yellow text-delijn-black px-4 py-2 rounded-xl font-bold hover:bg-delijn-yellow/80 transition-all"
        >
          <Plus size={18} />
          Poll Toevoegen
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Vraag</label>
              <input 
                type="text" 
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-delijn-yellow outline-none"
                placeholder="bijv. Wie wordt topscorer?"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Opties</label>
              <div className="space-y-3">
                {options.map((option, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[idx] = e.target.value;
                        setOptions(newOptions);
                      }}
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-delijn-yellow outline-none"
                      placeholder={`Optie ${idx + 1}`}
                    />
                    {options.length > 2 && (
                      <button 
                        type="button"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="p-3 text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setOptions([...options, ''])}
                  className="text-xs font-bold text-delijn-black hover:underline flex items-center gap-1"
                >
                  <Plus size={14} />
                  Optie toevoegen
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              type="submit"
              disabled={saving}
              className="flex-1 bg-delijn-black text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
            >
              {saving ? 'Bezig...' : 'Poll Opslaan'}
            </button>
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-8 bg-stone-100 text-stone-600 py-4 rounded-xl font-bold hover:bg-stone-200 transition-all"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {polls.map(poll => (
          <div key={poll.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold">{poll.question}</h3>
              <p className="text-sm text-stone-500">{poll.options.join(', ')}</p>
              <p className="text-xs text-stone-400 mt-1 font-bold uppercase tracking-widest">
                {poll.results?.reduce((a, b) => a + b, 0) || 0} stemmen
              </p>
            </div>
            <button 
              onClick={() => handleDelete(poll.id)}
              className="p-2 text-stone-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminBonusQuestionsView({ questions }: { questions: BonusQuestion[] }) {
  const [newQ, setNewQ] = useState('');
  const [newP, setNewP] = useState('5');
  const [newD, setNewD] = useState('');
  const [newO, setNewO] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newQ || !newD) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'bonusQuestions'), {
        question: newQ,
        points: parseInt(newP),
        deadline: new Date(newD).toISOString(),
        options: newO ? newO.split(',').map(s => s.trim()) : null,
        status: 'open'
      });
      setNewQ('');
      setNewO('');
    } catch (error) {
      console.error("Error adding bonus question:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: BonusQuestion['status'], correctAnswer?: string) => {
    const update: any = { status };
    if (correctAnswer) update.correctAnswer = correctAnswer;
    await updateDoc(doc(db, 'bonusQuestions', id), update);

    if (status === 'finished' && correctAnswer) {
      // Award points
      const answersSnapshot = await getDocs(query(collection(db, 'bonusAnswers'), where('questionId', '==', id)));
      const batch = writeBatch(db);
      const question = questions.find(q => q.id === id);
      
      const userPointsDelta: Record<string, number> = {};

      answersSnapshot.docs.forEach(ansDoc => {
        const ans = ansDoc.data() as BonusAnswer;
        if (ans.answer === correctAnswer) {
          batch.update(doc(db, 'bonusAnswers', ansDoc.id), { pointsEarned: question?.points });
          userPointsDelta[ans.userId] = (userPointsDelta[ans.userId] || 0) + (question?.points || 0);
        }
      });

      for (const [userId, delta] of Object.entries(userPointsDelta)) {
        batch.update(doc(db, 'profiles', userId), { totalPoints: increment(delta) });
      }

      await batch.commit();
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4">Nieuwe Bonusvraag</h3>
        <div className="grid gap-4">
          <input 
            type="text"
            placeholder="De vraag..."
            value={newQ}
            onChange={e => setNewQ(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
          />
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="number"
              placeholder="Punten"
              value={newP}
              onChange={e => setNewP(e.target.value)}
              className="bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
            />
            <input 
              type="datetime-local"
              value={newD}
              onChange={e => setNewD(e.target.value)}
              className="bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
            />
          </div>
          <input 
            type="text"
            placeholder="Opties (komma gescheiden, optioneel)"
            value={newO}
            onChange={e => setNewO(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
          />
          <button 
            onClick={handleAdd}
            disabled={adding || !newQ || !newD}
            className="bg-delijn-black text-white py-3 rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50"
          >
            Vraag Toevoegen
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {questions.map(q => (
          <div key={q.id} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold">{q.question}</p>
                <p className="text-xs text-stone-400">Status: {q.status} | Deadline: {format(new Date(q.deadline), 'd MMM HH:mm')}</p>
              </div>
              <button onClick={() => deleteDoc(doc(db, 'bonusQuestions', q.id))} className="text-stone-300 hover:text-red-600"><Trash2 size={18} /></button>
            </div>

            <div className="flex gap-2">
              {q.status === 'open' && (
                <button onClick={() => handleUpdateStatus(q.id, 'closed')} className="bg-stone-100 text-stone-600 px-3 py-1 rounded-lg text-xs font-bold">Sluiten</button>
              )}
              {q.status === 'closed' && (
                <div className="flex gap-2 w-full">
                  <input 
                    type="text" 
                    placeholder="Correct antwoord..." 
                    id={`correct-${q.id}`}
                    className="flex-1 bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg text-xs"
                  />
                  <button 
                    onClick={() => {
                      const val = (document.getElementById(`correct-${q.id}`) as HTMLInputElement).value;
                      if (val) handleUpdateStatus(q.id, 'finished', val);
                    }}
                    className="bg-delijn-yellow text-delijn-black px-3 py-1 rounded-lg text-xs font-bold"
                  >
                    Bevestig & Punten
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ConfirmationModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-100 animate-in zoom-in duration-200">
        <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="text-amber-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-stone-900 text-center mb-2">{title}</h3>
        <p className="text-stone-500 text-center mb-8">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Annuleren
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Bevestigen
          </button>
        </div>
      </div>
    </div>
  );
}

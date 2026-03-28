import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  limit,
  DocumentReference
} from 'firebase/firestore';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
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
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Timer,
  Camera,
  Bell,
  BarChart3,
  Vote,
  Smartphone,
  Users,
  Share2,
  PieChart,
  Copy,
  RefreshCw
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Match, Prediction, UserProfile, UserPrivate, BonusQuestion, BonusAnswer, Poll, PollVote, AppNotification, TournamentSettings, League, LeagueMember } from './types';
import { 
  addDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TEAM_COLORS: Record<string, { primary: string, secondary: string, text: string }> = {
  'België': { primary: '#E30613', secondary: '#FFD200', text: '#000000' },
  'Duitsland': { primary: '#000000', secondary: '#FFD200', text: '#FFFFFF' },
  'Frankrijk': { primary: '#002395', secondary: '#ED2939', text: '#FFFFFF' },
  'Spanje': { primary: '#AA151B', secondary: '#F1BF00', text: '#FFFFFF' },
  'Engeland': { primary: '#FFFFFF', secondary: '#CE1124', text: '#000000' },
  'Italië': { primary: '#008C45', secondary: '#F4F5F0', text: '#FFFFFF' },
  'Nederland': { primary: '#F36C21', secondary: '#FFFFFF', text: '#FFFFFF' },
  'Portugal': { primary: '#006600', secondary: '#FF0000', text: '#FFFFFF' },
  'Brazilië': { primary: '#FEDF00', secondary: '#009739', text: '#000000' },
  'Argentinië': { primary: '#75AADB', secondary: '#FFFFFF', text: '#000000' },
  'Marokko': { primary: '#C1272D', secondary: '#006233', text: '#FFFFFF' },
  'Kroatië': { primary: '#FF0000', secondary: '#FFFFFF', text: '#FFFFFF' },
};

const DEFAULT_THEME = { primary: '#10b981', secondary: '#0f172a', text: '#f8fafc' };

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

function LeaguesView({ 
  leagues, 
  memberships, 
  userId, 
  userProfile,
  onViewLeague 
}: { 
  leagues: League[], 
  memberships: LeagueMember[], 
  userId: string, 
  userProfile: UserProfile,
  onViewLeague: (league: League) => void 
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [leagueDesc, setLeagueDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const myLeagues = leagues.filter(l => memberships.some(m => m.leagueId === l.id));

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName) return;
    setLoading(true);
    setError('');
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const leagueRef = doc(collection(db, 'leagues'));
      const leagueData: League = {
        id: leagueRef.id,
        name: leagueName,
        description: leagueDesc,
        createdBy: userId,
        inviteCode: code,
        createdAt: serverTimestamp(),
        memberCount: 1
      };
      await setDoc(leagueRef, leagueData);

      const memberRef = doc(collection(db, 'leagueMembers'));
      const memberData: LeagueMember = {
        id: memberRef.id,
        leagueId: leagueRef.id,
        userId: userId,
        joinedAt: serverTimestamp(),
        displayName: userProfile.displayName,
        totalPoints: userProfile.totalPoints
      };
      await setDoc(memberRef, memberData);

      setIsCreating(false);
      setLeagueName('');
      setLeagueDesc('');
    } catch (err) {
      setError('Kon league niet aanmaken.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    setLoading(true);
    setError('');
    try {
      const q = query(collection(db, 'leagues'), where('inviteCode', '==', inviteCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setError('Ongeldige code.');
        return;
      }
      const league = snap.docs[0].data() as League;
      
      const memberQ = query(collection(db, 'leagueMembers'), where('leagueId', '==', league.id), where('userId', '==', userId));
      const memberSnap = await getDocs(memberQ);
      if (!memberSnap.empty) {
        setError('Je bent al lid van deze league.');
        return;
      }

      const memberRef = doc(collection(db, 'leagueMembers'));
      const memberData: LeagueMember = {
        id: memberRef.id,
        leagueId: league.id,
        userId: userId,
        joinedAt: serverTimestamp(),
        displayName: userProfile.displayName,
        totalPoints: userProfile.totalPoints
      };
      await setDoc(memberRef, memberData);
      await updateDoc(doc(db, 'leagues', league.id), { memberCount: increment(1) });

      setIsJoining(false);
      setInviteCode('');
    } catch (err) {
      setError('Kon niet deelnemen aan league.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">Privé Leagues</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Strijd tegen je eigen groepen en collega's</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setIsJoining(true); setIsCreating(false); }}
            className="flex-1 sm:flex-none glass-card px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={14} /> Deelnemen
          </button>
          <button 
            onClick={() => { setIsCreating(true); setIsJoining(false); }}
            className="flex-1 sm:flex-none bg-delijn-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
          >
            <Plus size={14} /> Nieuwe League
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateLeague} className="glass-card p-8 rounded-[2.5rem] space-y-6 border-2 border-theme-primary/20">
              <h3 className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Nieuwe League Aanmaken</h3>
              <div className="grid gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Naam van de League</label>
                  <input 
                    value={leagueName}
                    onChange={e => setLeagueName(e.target.value)}
                    className="w-full glass-input p-4 rounded-2xl outline-none font-bold text-slate-900"
                    placeholder="Bijv. De Lijn Gent - Chauffeurs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Beschrijving (Optioneel)</label>
                  <input 
                    value={leagueDesc}
                    onChange={e => setLeagueDesc(e.target.value)}
                    className="w-full glass-input p-4 rounded-2xl outline-none font-bold text-slate-900"
                    placeholder="Bijv. De leukste competitie van de stelplaats"
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuleren</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-theme-primary text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-theme-primary/90 disabled:opacity-50 shadow-lg shadow-theme-primary/20"
                >
                  {loading ? 'Aanmaken...' : 'League Aanmaken'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {isJoining && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleJoinLeague} className="glass-card p-8 rounded-[2.5rem] space-y-6 border-2 border-theme-primary/20">
              <h3 className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Deelnemen aan League</h3>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Uitnodigingscode</label>
                <input 
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  className="w-full glass-input p-4 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em] text-slate-900 uppercase"
                  placeholder="CODE12"
                  maxLength={6}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsJoining(false)} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest">Annuleren</button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-theme-primary text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-theme-primary/90 disabled:opacity-50 shadow-lg shadow-theme-primary/20"
                >
                  {loading ? 'Deelnemen...' : 'Lid Worden'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myLeagues.length === 0 ? (
          <div className="col-span-full">
            <EmptyState message="Je bent nog geen lid van een privé league." />
          </div>
        ) : (
          myLeagues.map((league, idx) => (
            <motion.div 
              key={league.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onViewLeague(league)}
              className="glass-card p-8 rounded-[2.5rem] cursor-pointer hover:shadow-2xl hover:shadow-slate-200 transition-all group border-t-4 border-theme-primary"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                  <Users size={24} className="text-slate-400" />
                </div>
                <div className="bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {league.memberCount} Leden
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 font-display uppercase tracking-tight mb-2">{league.name}</h3>
              <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-6">{league.description || 'Geen beschrijving beschikbaar.'}</p>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Code:</span>
                  <span className="text-xs font-black text-slate-900 tracking-widest">{league.inviteCode}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:translate-x-2 transition-transform">
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function LeagueDetailView({ 
  league, 
  onBack, 
  currentUserId,
  userRole
}: { 
  league: League, 
  onBack: () => void, 
  currentUserId: string,
  userRole: string
}) {
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'leagueMembers'), where('leagueId', '==', league.id), orderBy('totalPoints', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(doc => doc.data() as LeagueMember));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'leagueMembers'));
    return () => unsubscribe();
  }, [league.id]);

  const copyCode = () => {
    navigator.clipboard.writeText(league.inviteCode);
  };

  const handleDeleteLeague = async () => {
    setIsDeleting(true);
    setShowConfirmDelete(false);
    try {
      const batch = writeBatch(db);
      
      // Delete all members
      const membersSnap = await getDocs(query(collection(db, 'leagueMembers'), where('leagueId', '==', league.id)));
      membersSnap.docs.forEach(memberDoc => {
        batch.delete(memberDoc.ref);
      });
      
      // Delete the league
      batch.delete(doc(db, 'leagues', league.id));
      
      await batch.commit();
      onBack();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'leagues');
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = league.createdBy === currentUserId;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-4 glass-card hover:bg-slate-50 rounded-[1.5rem] transition-all active:scale-95 shadow-lg shadow-slate-200/50">
          <ArrowRight className="rotate-180 text-slate-900" size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">{league.name}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">League Klassement</p>
        </div>
        <div className="flex items-center gap-3">
          {canDelete && (
            <button 
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting}
              className="p-4 glass-card hover:bg-red-50 text-red-500 rounded-[1.5rem] transition-all active:scale-95 shadow-lg shadow-slate-200/50 disabled:opacity-50"
              title="League Verwijderen"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={copyCode}
            className="glass-card px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all group"
          >
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code: {league.inviteCode}</span>
            <Copy size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDelete(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">League Verwijderen?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Weet je zeker dat je <span className="font-bold text-slate-900">"{league.name}"</span> wilt verwijderen? 
                  Alle leden en hun scores in deze league gaan verloren. Dit kan niet ongedaan worden gemaakt.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Annuleren
                </button>
                <button 
                  onClick={handleDeleteLeague}
                  className="flex-1 py-4 px-6 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                >
                  Verwijderen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border-2 border-slate-50">
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Laden...</div>
          ) : members.length === 0 ? (
            <EmptyState message="Nog geen leden in deze league." />
          ) : (
            members.map((member, index) => (
              <div 
                key={member.id} 
                className={cn(
                  "flex items-center gap-5 p-6 transition-all duration-500",
                  member.userId === currentUserId ? "bg-theme-primary/[0.03]" : "hover:bg-slate-50/80"
                )}
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black font-display text-slate-400">
                  {index + 1}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg overflow-hidden border-2 border-white">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.displayName}`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 uppercase tracking-tight text-base">{member.displayName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black font-display text-slate-900">{member.totalPoints}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Punten</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PredictionStats({ matchId, predictions }: { matchId: string, predictions: Prediction[] }) {
  const matchPredictions = predictions.filter(p => p.matchId === matchId);
  if (matchPredictions.length === 0) return null;

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  matchPredictions.forEach(p => {
    if (p.homeScore > p.awayScore) homeWins++;
    else if (p.homeScore < p.awayScore) awayWins++;
    else draws++;
  });

  const total = matchPredictions.length;
  const homePct = Math.round((homeWins / total) * 100);
  const drawPct = Math.round((draws / total) * 100);
  const awayPct = Math.round((awayWins / total) * 100);

  return (
    <div className="mt-4 pt-4 border-t border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Voorspellingen</span>
        <span className="text-xs font-medium text-stone-500">{total} {total === 1 ? 'stem' : 'stemmen'}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-stone-100">
        <div style={{ width: `${homePct}%` }} className="bg-emerald-500 h-full" title={`Thuiswinst: ${homePct}%`} />
        <div style={{ width: `${drawPct}%` }} className="bg-stone-400 h-full" title={`Gelijkspel: ${drawPct}%`} />
        <div style={{ width: `${awayPct}%` }} className="bg-red-500 h-full" title={`Uitwinst: ${awayPct}%`} />
      </div>
      <div className="flex justify-between mt-1 text-[10px] font-bold text-stone-500">
        <span>1: {homePct}%</span>
        <span>X: {drawPct}%</span>
        <span>2: {awayPct}%</span>
      </div>
    </div>
  );
}

function HeadToHeadView({ 
  currentUser, 
  targetUser, 
  matches, 
  predictions, 
  onBack 
}: { 
  currentUser: UserProfile, 
  targetUser: UserProfile, 
  matches: Match[], 
  predictions: Prediction[],
  onBack: () => void
}) {
  const currentPredictions = predictions.filter(p => p.userId === currentUser.uid);
  const targetPredictions = predictions.filter(p => p.userId === targetUser.uid);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-4 glass-card hover:bg-slate-50 rounded-[1.5rem] transition-all active:scale-95 shadow-lg shadow-slate-200/50">
          <ArrowRight className="rotate-180 text-slate-900" size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">Head-to-Head</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vergelijking met {targetUser.displayName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-8 rounded-[2.5rem] text-center relative overflow-hidden group border-t-4 border-theme-primary">
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] border-4 border-white p-1 bg-white shadow-2xl group-hover:scale-110 transition-transform duration-500">
              <img src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.displayName}`} className="w-full h-full rounded-[1.5rem] object-cover" />
            </div>
            <p className="font-black text-slate-900 uppercase tracking-tight mb-1 text-lg">{currentUser.displayName}</p>
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-full">
              <span className="text-xl font-black font-display">{currentUser.totalPoints}</span>
              <span className="text-[10px] uppercase font-black tracking-widest opacity-60">pts</span>
            </div>
          </div>
        </div>
        <div className="glass-card p-8 rounded-[2.5rem] text-center relative overflow-hidden group border-t-4 border-slate-200">
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] border-4 border-white p-1 bg-white shadow-2xl group-hover:scale-110 transition-transform duration-500">
              <img src={targetUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.displayName}`} className="w-full h-full rounded-[1.5rem] object-cover" />
            </div>
            <p className="font-black text-slate-900 uppercase tracking-tight mb-1 text-lg">{targetUser.displayName}</p>
            <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-900 px-4 py-1.5 rounded-full">
              <span className="text-xl font-black font-display">{targetUser.totalPoints}</span>
              <span className="text-[10px] uppercase font-black tracking-widest opacity-40">pts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Match Vergelijking</h3>
          <div className="flex gap-6 text-[9px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div> Punten</span>
            <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div> Geen</span>
          </div>
        </div>
        
        <div className="grid gap-4">
          {matches.filter(m => m.status === 'finished').map(match => {
            const myPred = currentPredictions.find(p => p.matchId === match.id);
            const theirPred = targetPredictions.find(p => p.matchId === match.id);

            return (
              <div key={match.id} className="glass-card p-6 rounded-[2rem] hover:shadow-xl transition-all group">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                    <Calendar size={10} className="text-slate-400" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(match.date), 'dd MMM HH:mm', { locale: nl })}</span>
                  </div>
                  <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black font-display tracking-[0.2em]">
                    {match.homeScore} - {match.awayScore}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1 text-right">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{match.homeTeam}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-12 rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm",
                      myPred && myPred.pointsEarned && myPred.pointsEarned > 0 ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-50 text-slate-400 border border-slate-100"
                    )}>
                      <span className="text-xs font-black font-display">{myPred ? `${myPred.homeScore}-${myPred.awayScore}` : 'N/A'}</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Jij</span>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className={cn(
                      "w-16 h-12 rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm",
                      theirPred && theirPred.pointsEarned && theirPred.pointsEarned > 0 ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-50 text-slate-400 border border-slate-100"
                    )}>
                      <span className="text-xs font-black font-display">{theirPred ? `${theirPred.homeScore}-${theirPred.awayScore}` : 'N/A'}</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">Them</span>
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{match.awayTeam}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RankChart({ history }: { history: { timestamp: any, rank: number }[] }) {
  if (!history || history.length < 2) return null;

  const data = history.map(h => ({
    name: format(new Date(h.timestamp?.seconds * 1000 || h.timestamp), 'dd/MM'),
    rank: h.rank
  }));

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRank" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" hide />
          <YAxis reversed hide />
          <Tooltip 
            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
            labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}
            itemStyle={{ fontWeight: 'bold', color: 'var(--theme-primary)' }}
          />
          <Area type="monotone" dataKey="rank" stroke="var(--theme-primary)" fillOpacity={1} fill="url(#colorRank)" strokeWidth={4} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState<UserPrivate | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'predictions' | 'leaderboard' | 'admin' | 'rules' | 'bonus' | 'chat' | 'settings' | 'polls' | 'h2h' | 'leagues' | 'standings'>('predictions');
  const [h2hTargetId, setH2hTargetId] = useState<string | null>(null);
  const [previewTeam, setPreviewTeam] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<BonusQuestion[]>([]);
  const [bonusAnswers, setBonusAnswers] = useState<BonusAnswer[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tournamentSettings, setTournamentSettings] = useState<TournamentSettings | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [memberships, setMemberships] = useState<LeagueMember[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

  const myPredictions = useMemo(() => {
    if (!user) return [];
    return predictions.filter(p => p.userId === user.uid);
  }, [predictions, user?.uid]);

  const theme = useMemo(() => {
    const team = (previewTeam && activeTab === 'settings') ? previewTeam : profile?.favoriteTeam;
    return (team && TEAM_COLORS[team]) ? TEAM_COLORS[team] : DEFAULT_THEME;
  }, [previewTeam, activeTab, profile?.favoriteTeam]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-text', theme.text);
  }, [theme]);

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
              role: (firebaseUser.email === 'christoffrotty84@gmail.com' || firebaseUser.email === '29076@delijn.be' || firebaseUser.email === 'christoff.rotty@icloud.com') ? 'admin' : 'user'
            };
            try {
              await setDoc(userDocRef, userData);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'users/' + firebaseUser.uid);
            }
          } else if (userDoc) {
            userData = userDoc.data() as UserPrivate;
            // Force admin role if email matches but role is not admin
            if ((firebaseUser.email === 'christoffrotty84@gmail.com' || firebaseUser.email === '29076@delijn.be' || firebaseUser.email === 'christoff.rotty@icloud.com') && userData.role !== 'admin') {
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
      user.role === 'admin' 
        ? collection(db, 'predictions')
        : query(collection(db, 'predictions'), where('userId', '==', user.uid)),
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

    const profileUnsubscribe = onSnapshot(
      doc(db, 'profiles', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'profiles/' + user.uid)
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

      const tournamentSettingsUnsubscribe = onSnapshot(
        doc(db, 'tournamentSettings', 'results'),
        (snapshot) => {
          if (snapshot.exists()) {
            setTournamentSettings({ id: snapshot.id, ...snapshot.data() } as TournamentSettings);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'tournamentSettings')
      );

      const leaguesUnsubscribe = onSnapshot(
        collection(db, 'leagues'),
        (snapshot) => {
          setLeagues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as League)));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'leagues')
      );

      const membershipsUnsubscribe = onSnapshot(
        query(collection(db, 'leagueMembers'), where('userId', '==', user.uid)),
        (snapshot) => {
          setMemberships(snapshot.docs.map(doc => doc.data() as LeagueMember));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'leagueMembers')
      );

      return () => {
        matchesUnsubscribe();
        predictionsUnsubscribe();
        leaderboardUnsubscribe();
        profileUnsubscribe();
        bonusQuestionsUnsubscribe();
        bonusAnswersUnsubscribe();
        pollsUnsubscribe();
        pollVotesUnsubscribe();
        notificationsUnsubscribe();
        tournamentSettingsUnsubscribe();
        leaguesUnsubscribe();
        membershipsUnsubscribe();
      };
  }, [user]);

    const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    console.log("Auth attempt:", { isResetting, isRegistering, email });

    try {
      if (isResetting) {
        await sendPasswordResetEmail(auth, email);
        setAuthSuccess('Er is een e-mail gestuurd naar ' + email + ' om je wachtwoord te herstellen. Controleer ook je spam-folder.');
        setAuthError('');
      } else if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      let message = "Authenticatie mislukt.";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = "Onjuiste e-mail of wachtwoord. Controleer je gegevens of registreer een nieuw account.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Te veel mislukte pogingen. Probeer het later opnieuw.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "Dit e-mailadres is al in gebruik.";
      } else if (error.code === 'auth/weak-password') {
        message = "Het wachtwoord is te zwak.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Deze operatie is niet toegestaan. Neem contact op met de beheerder.";
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
          <h1 className="text-2xl font-bold text-delijn-black text-center mb-2">WK Prognose 2026 De Lijn</h1>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40">
        <div className="w-full px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-primary rounded-2xl flex items-center justify-center shadow-lg shadow-theme-primary/20 rotate-3">
              <Trophy className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 font-display uppercase">WK<span className="text-theme-primary">PROGNOSE</span> 2026</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] -mt-1">De Lijn</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all relative"
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">Notificaties</h3>
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={async () => {
                          const unread = notifications.filter(n => !n.read);
                          for (const n of unread) {
                            await updateDoc(doc(db, 'notifications', n.id), { read: true });
                          }
                        }}
                        className="text-[10px] font-black text-theme-primary uppercase hover:underline"
                      >
                        Alles gelezen
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Bell size={24} className="text-slate-300" />
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Geen meldingen</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={cn(
                            "p-5 border-b border-slate-50 last:border-0 transition-colors cursor-pointer hover:bg-slate-50",
                            !notification.read && "bg-theme-primary/5"
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
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                              <Info size={18} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900 leading-tight mb-1">{notification.title}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{notification.message}</p>
                              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">
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
              onClick={() => setActiveTab('rules')}
              className={cn(
                "p-2.5 rounded-2xl transition-all",
                activeTab === 'rules' ? "bg-theme-primary text-white shadow-lg shadow-theme-primary/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <HelpCircle size={20} />
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
              title="Uitloggen"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8">
        <CountdownTimer matches={matches} />

        {activeTab === 'predictions' && (
          <PredictionsView 
            matches={matches} 
            predictions={predictions} 
            userId={user.uid} 
            isAdmin={user.role === 'admin'} 
          />
        )}
        {activeTab === 'standings' && (
          <TournamentStandingsView matches={matches} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView 
            leaderboard={leaderboard} 
            currentUserId={user.uid} 
            onCompare={(targetId) => {
              setH2hTargetId(targetId);
              setActiveTab('h2h');
            }}
            predictions={predictions}
            matches={matches}
          />
        )}
        {activeTab === 'h2h' && h2hTargetId && (
          <HeadToHeadView 
            currentUser={profile!} 
            targetUser={leaderboard.find(p => p.uid === h2hTargetId)!}
            matches={matches}
            predictions={predictions}
            onBack={() => setActiveTab('leaderboard')}
          />
        )}
        {activeTab === 'bonus' && (
          <BonusQuestionsView questions={bonusQuestions} answers={bonusAnswers} userId={user.uid} />
        )}
        {activeTab === 'leagues' && !selectedLeague && (
          <LeaguesView 
            leagues={leagues} 
            memberships={memberships} 
            userId={user.uid} 
            userProfile={profile!}
            onViewLeague={setSelectedLeague}
          />
        )}
        {activeTab === 'leagues' && selectedLeague && (
          <LeagueDetailView 
            league={selectedLeague} 
            onBack={() => setSelectedLeague(null)} 
            currentUserId={user.uid} 
            userRole={user.role}
          />
        )}
        {activeTab === 'polls' && (
          <PollsView polls={polls} pollVotes={pollVotes} userId={user.uid} />
        )}
        {activeTab === 'rules' && (
          <RulesView />
        )}
        {activeTab === 'settings' && (
          <SettingsView 
            profile={profile} 
            user={user} 
            onThemePreview={setPreviewTeam}
          />
        )}
        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminView 
            matches={matches} 
            bonusQuestions={bonusQuestions} 
            polls={polls} 
            tournamentSettings={tournamentSettings}
            leaderboard={leaderboard}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
        <nav className="bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] h-20 flex items-center justify-around px-4">
          <TabButton 
            active={activeTab === 'predictions'} 
            onClick={() => setActiveTab('predictions')}
            icon={<Calendar />}
            label="Pronos"
          />
          <TabButton 
            active={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')}
            icon={<Trophy />}
            label="Klassement"
          />
          <TabButton 
            active={activeTab === 'standings'} 
            onClick={() => setActiveTab('standings')}
            icon={<PieChart />}
            label="Standen"
          />
          <TabButton 
            active={activeTab === 'leagues'} 
            onClick={() => { setActiveTab('leagues'); setSelectedLeague(null); }}
            icon={<Users />}
            label="Leagues"
          />
          <TabButton 
            active={activeTab === 'bonus'} 
            onClick={() => setActiveTab('bonus')}
            icon={<HelpCircle />}
            label="Bonus"
          />
          <TabButton 
            active={activeTab === 'polls'} 
            onClick={() => setActiveTab('polls')}
            icon={<BarChart3 />}
            label="Polls"
          />
          {user.role === 'admin' && (
            <TabButton 
              active={activeTab === 'admin'} 
              onClick={() => setActiveTab('admin')}
              icon={<ShieldCheck />}
              label="Admin"
            />
          )}
        </nav>
      </div>
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
        "flex flex-col items-center justify-center gap-1 transition-all duration-300 relative px-2",
        active ? "text-theme-primary scale-110" : "text-slate-400 hover:text-slate-600"
      )}
    >
      <div className={cn(
        "p-2 rounded-2xl transition-all duration-300",
        active ? "bg-theme-primary/10 shadow-inner" : "bg-transparent"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: active ? 2.5 : 2 })}
      </div>
      <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300", active ? "opacity-100" : "opacity-0 h-0")}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute -top-1 w-1 h-1 bg-theme-primary rounded-full"
        />
      )}
    </button>
  );
}

function PredictionsView({ 
  matches, 
  predictions, 
  userId,
  isAdmin 
}: { 
  matches: Match[]; 
  predictions: Prediction[]; 
  userId: string;
  isAdmin: boolean;
}) {
  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  const finishedMatches = matches.filter(m => m.status === 'finished');

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Scoring Rules Tile */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 mb-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-theme-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-theme-primary/20 transition-colors duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Trophy className="text-theme-primary" size={20} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Puntentelling</h3>
            </div>
            <p className="text-white/60 text-sm font-bold leading-relaxed max-w-md">
              Voorspel de scores en beklim het klassement! Punten worden als volgt verdeeld:
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 min-w-[140px]">
              <div className="w-10 h-10 rounded-xl bg-theme-primary flex items-center justify-center text-white font-black text-lg shadow-lg shadow-theme-primary/20">3</div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Correct</p>
                <p className="text-xs font-bold text-white">Exacte score</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 min-w-[140px]">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black text-lg">1</div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Winnaar</p>
                <p className="text-xs font-bold text-white">Juiste winnaar</p>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-4 min-w-[140px]">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 font-black text-lg">0</div>
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Fout</p>
                <p className="text-xs font-bold text-white">Alles onjuist</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-theme-primary/10 flex items-center justify-center">
                <Clock className="text-theme-primary" size={22} />
              </div>
              Komende Wedstrijden
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 ml-13">Voorspel de scores van de volgende matchen</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-theme-primary animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{upcomingMatches.length} Matchen</span>
          </div>
        </div>
        {upcomingMatches.length === 0 ? (
          <EmptyState message="Geen komende wedstrijden gevonden." />
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid gap-6"
          >
            {upcomingMatches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                prediction={predictions.find(p => p.matchId === match.id && p.userId === userId)}
                userId={userId}
                allPredictions={predictions}
                isAdmin={isAdmin}
              />
            ))}
          </motion.div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <CheckCircle2 className="text-slate-400" size={22} />
              </div>
              Gespeelde Wedstrijden
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 ml-13">Bekijk de resultaten en jouw punten</p>
          </div>
        </div>
        {finishedMatches.length === 0 ? (
          <EmptyState message="Nog geen wedstrijden gespeeld." />
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid gap-6"
          >
            {finishedMatches.map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                prediction={predictions.find(p => p.matchId === match.id && p.userId === userId)}
                userId={userId}
                readonly
                allPredictions={predictions}
                isAdmin={isAdmin}
              />
            ))}
          </motion.div>
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
  isAdmin?: boolean;
}> = ({ match, prediction, userId, readonly, allPredictions = [], isAdmin }) => {
  const [homeScore, setHomeScore] = useState(prediction?.homeScore?.toString() || '');
  const [awayScore, setAwayScore] = useState(prediction?.awayScore?.toString() || '');
  const [firstGoalMinute, setFirstGoalMinute] = useState(prediction?.firstGoalMinute?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the values that were actually saved to Firestore
  const lastSavedValues = useRef({
    home: prediction?.homeScore?.toString() || '',
    away: prediction?.awayScore?.toString() || '',
    minute: prediction?.firstGoalMinute?.toString() || ''
  });

  // Track if we've received the first data for this match
  const hasLoaded = useRef(false);

  // Sync state with props when prediction loads or changes
  useEffect(() => {
    if (prediction) {
      hasLoaded.current = true;
      const propHome = prediction.homeScore?.toString() || '';
      const propAway = prediction.awayScore?.toString() || '';
      const propMinute = prediction.firstGoalMinute?.toString() || '';
      
      // Only sync if the server data is DIFFERENT from what we last saved
      // AND we are not currently saving
      if (!saving && (propHome !== lastSavedValues.current.home || propAway !== lastSavedValues.current.away || propMinute !== lastSavedValues.current.minute)) {
        setHomeScore(propHome);
        setAwayScore(propAway);
        setFirstGoalMinute(propMinute);
        lastSavedValues.current = { home: propHome, away: propAway, minute: propMinute };
      }
    } else if (!prediction && !saving && !showSuccess) {
      // If prediction is removed or doesn't exist, and we're not saving,
      // only clear if we previously had a saved prediction AND we've loaded data before
      if (hasLoaded.current && (lastSavedValues.current.home !== '' || lastSavedValues.current.away !== '')) {
        setHomeScore('');
        setAwayScore('');
        setFirstGoalMinute('');
        lastSavedValues.current = { home: '', away: '', minute: '' };
      }
    }
  }, [prediction, saving, showSuccess]);

  const isLocked = false; // Deadline restriction removed as requested

  const matchPredictions = allPredictions.filter(p => p.matchId === match.id);
  const totalPredictions = matchPredictions.length;
  
  const stats = {
    home: matchPredictions.filter(p => p.homeScore > p.awayScore).length,
    draw: matchPredictions.filter(p => p.homeScore === p.awayScore).length,
    away: matchPredictions.filter(p => p.homeScore < p.awayScore).length,
  };

  const getPercent = (count: number) => totalPredictions > 0 ? Math.round((count / totalPredictions) * 100) : 0;

  const handleSave = async () => {
    if (!userId) {
      console.error('Cannot save prediction: No userId found');
      return;
    }
    if (homeScore === '' || awayScore === '') return;
    
    setSaving(true);
    setError(null);
    try {
      const predData = {
        userId,
        matchId: match.id,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        firstGoalMinute: firstGoalMinute !== '' ? parseInt(firstGoalMinute) : null,
      };

      if (prediction) {
        await updateDoc(doc(db, 'predictions', prediction.id), {
          homeScore: predData.homeScore,
          awayScore: predData.awayScore,
          firstGoalMinute: predData.firstGoalMinute,
        });
      } else {
        const newPredRef = doc(collection(db, 'predictions'));
        await setDoc(newPredRef, { 
          id: newPredRef.id, 
          ...predData 
        });
      }
      
      // Update last saved values immediately for optimistic feel
      lastSavedValues.current = { home: homeScore, away: awayScore, minute: firstGoalMinute };
      hasLoaded.current = true;
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving prediction:', err);
      setError(err.message || 'Fout bij het opslaan');
      handleFirestoreError(err, OperationType.WRITE, 'predictions');
    } finally {
      setSaving(false);
    }
  };

  const isSaved = prediction && 
    prediction.homeScore.toString() === homeScore && 
    prediction.awayScore.toString() === awayScore &&
    (prediction.firstGoalMinute?.toString() || '') === firstGoalMinute;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "glass-card p-6 rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 group",
        readonly && "opacity-90"
      )}
    >
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-full">
            <Calendar size={12} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {format(new Date(match.date), 'EEEE d MMMM HH:mm', { locale: nl })}
            </span>
          </div>
          {match.status === 'finished' && (
            <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              Finished
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 sm:gap-12">
          <div className="flex-1 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner border border-slate-100 group-hover:scale-110 transition-transform duration-500">
              <span className="text-2xl font-black text-slate-900 font-display">{match.homeTeam.substring(0, 3).toUpperCase()}</span>
            </div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{match.homeTeam}</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            {error && (
              <div className="text-red-500 text-[10px] font-bold uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full animate-pulse">
                {error}
              </div>
            )}
            <div className="flex items-center gap-3">
              {match.status === 'finished' ? (
                <div className="flex items-center gap-4 text-4xl font-black font-display text-slate-900 tracking-tighter">
                  <span>{match.homeScore}</span>
                  <span className="text-slate-200 text-2xl">:</span>
                  <span>{match.awayScore}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    disabled={readonly || saving || isLocked}
                    className="w-16 h-16 text-center glass-input rounded-[1.5rem] text-2xl font-black font-display text-slate-900 focus:ring-4 focus:ring-theme-primary/10 outline-none transition-all disabled:opacity-50"
                    placeholder="-"
                  />
                  <span className="text-slate-200 font-black text-2xl">:</span>
                  <input 
                    type="number" 
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    disabled={readonly || saving || isLocked}
                    className="w-16 h-16 text-center glass-input rounded-[1.5rem] text-2xl font-black font-display text-slate-900 focus:ring-4 focus:ring-theme-primary/10 outline-none transition-all disabled:opacity-50"
                    placeholder="-"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 mt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eerste Doelpunt (Minuut)</p>
              {match.status === 'finished' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center font-black font-display">
                    {match.firstGoalMinute ?? '-'}
                  </div>
                  {prediction?.firstGoalMinute === match.firstGoalMinute && match.firstGoalMinute !== undefined && match.firstGoalMinute !== null && (
                    <span className="text-[8px] font-black text-theme-primary uppercase mt-1">Exact! (+2)</span>
                  )}
                </div>
              ) : (
                <input 
                  type="number" 
                  min="0"
                  max="120"
                  value={firstGoalMinute}
                  onChange={(e) => setFirstGoalMinute(e.target.value)}
                  disabled={readonly || saving || isLocked}
                  className="w-16 h-10 text-center glass-input rounded-xl text-lg font-black font-display text-slate-900 focus:ring-4 focus:ring-theme-primary/10 outline-none transition-all disabled:opacity-50"
                  placeholder="-"
                />
              )}
            </div>
            
            {!readonly && (
              <div className="w-full space-y-2">
                <button 
                  onClick={handleSave}
                  disabled={saving || (isSaved && !showSuccess) || homeScore === '' || awayScore === '' || isLocked}
                  className={cn(
                    "w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg",
                    (isSaved || showSuccess)
                      ? "bg-emerald-500 text-white shadow-emerald-200" 
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200 disabled:opacity-50"
                  )}
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full mx-auto" /> : (isSaved || showSuccess) ? 'Opgeslagen' : 'Voorspelling Opslaan'}
                </button>
                {isLocked && (
                  <div className="flex items-center justify-center gap-2 text-red-500">
                    <Lock size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Gesloten (1u voor match)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner border border-slate-100 group-hover:scale-110 transition-transform duration-500">
              <span className="text-2xl font-black text-slate-900 font-display">{match.awayTeam.substring(0, 3).toUpperCase()}</span>
            </div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{match.awayTeam}</p>
          </div>
        </div>

        {readonly && prediction && (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <UserIcon size={14} className="text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jouw gok</p>
                <p className="text-sm font-black text-slate-900">{prediction.homeScore} - {prediction.awayScore}</p>
              </div>
            </div>
            {prediction.pointsEarned !== undefined && (
              <div className={cn(
                "px-4 py-2 rounded-xl font-black text-sm",
                prediction.pointsEarned > 0 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-200 text-slate-500"
              )}>
                +{prediction.pointsEarned} ptn
              </div>
            )}
          </div>
        )}

        {totalPredictions > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <BarChart3 size={14} className="text-theme-primary" />
                Onze stelplaats ({totalPredictions})
              </p>
              <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest">
                <span className="text-slate-900">{getPercent(stats.home)}% Thuis</span>
                <span className="text-slate-400">{getPercent(stats.draw)}% Gelijkspel</span>
                <span className="text-theme-primary">{getPercent(stats.away)}% Uitploeg</span>
              </div>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 p-0.5">
              <div 
                className="bg-slate-900 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${getPercent(stats.home)}%` }}
              />
              <div 
                className="bg-slate-200 rounded-full transition-all duration-1000 ease-out mx-0.5" 
                style={{ width: `${getPercent(stats.draw)}%` }}
              />
              <div 
                className="bg-theme-primary rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${getPercent(stats.away)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">Polls & Vragen</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Geef je mening en win extra badges</p>
        </div>
        <div className="w-14 h-14 glass-card rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50">
          <BarChart3 className="text-theme-primary" size={24} />
        </div>
      </div>

      <div className="grid gap-8">
        {polls.map(poll => {
          const userVote = pollVotes.find(v => v.pollId === poll.id);
          const totalVotes = poll.results?.reduce((a, b) => a + b, 0) || 0;

          return (
            <div key={poll.id} className="glass-card p-8 rounded-[2.5rem] hover:shadow-2xl transition-all duration-500 group">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 group-hover:text-theme-primary transition-colors">{poll.question}</h3>
              <div className="space-y-4">
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
                        "w-full relative h-16 rounded-[1.5rem] border-2 transition-all overflow-hidden group/btn",
                        isSelected 
                          ? "border-theme-primary bg-theme-primary/5" 
                          : userVote 
                            ? "border-slate-50 bg-slate-50/50" 
                            : "border-slate-100 hover:border-theme-primary hover:bg-slate-50"
                      )}
                    >
                      {userVote && (
                        <div 
                          className={cn(
                            "absolute inset-y-0 left-0 transition-all duration-1000 ease-out",
                            isSelected ? "bg-theme-primary/20" : "bg-slate-200/30"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      )}
                      <div className="absolute inset-0 px-6 flex items-center justify-between">
                        <span className={cn(
                          "font-black uppercase tracking-widest text-[11px] transition-colors",
                          isSelected ? "text-slate-900" : "text-slate-500"
                        )}>
                          {option}
                        </span>
                        {userVote && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-black font-display text-sm">{percent}%</span>
                            {isSelected && <CheckCircle2 size={14} className="text-theme-primary" />}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {userVote && (
                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  Bedankt voor je stem!
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                </div>
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
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">Puntentelling</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Hoe verdien je punten in de league?</p>
          </div>
          <div className="w-14 h-14 glass-card rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50">
            <Trophy className="text-theme-primary" size={24} />
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] overflow-hidden border-2 border-slate-50">
          <div className="p-10">
            <div className="space-y-10">
              <div className="flex items-center gap-8 group">
                <div className="bg-theme-primary text-white w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl font-black font-display shrink-0 shadow-2xl shadow-theme-primary/20 group-hover:scale-110 transition-transform duration-500">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Correcte Uitslag</h3>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed">Je hebt de exacte score van de wedstrijd juist voorspeld. De ultieme prestatie!</p>
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center gap-8 group">
                <div className="bg-slate-900 text-white w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl font-black font-display shrink-0 shadow-2xl shadow-slate-200 group-hover:scale-110 transition-transform duration-500">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Correcte Winnaar</h3>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed">Je hebt de winnaar of een gelijkspel juist voorspeld, maar niet de exacte score.</p>
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center gap-8 group">
                <div className="bg-slate-100 text-slate-400 w-20 h-20 rounded-[2rem] flex items-center justify-center text-3xl font-black font-display shrink-0 group-hover:scale-110 transition-transform duration-500">
                  0
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Foutieve Gok</h3>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed">Je hebt noch de winnaar, noch de score juist voorspeld. Volgende keer beter!</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 p-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Info className="text-white" size={18} />
            </div>
            <p className="text-[11px] font-black text-white/60 uppercase tracking-widest leading-relaxed">
              Punten worden automatisch berekend zodra de admin de officiële uitslag invoert.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileModal({ 
  profile, 
  predictions, 
  matches, 
  onClose 
}: { 
  profile: UserProfile, 
  predictions: Prediction[], 
  matches: Match[], 
  onClose: () => void 
}) {
  const userPredictions = predictions.filter(p => p.userId === profile.uid);
  const finishedMatches = matches.filter(m => m.status === 'finished');
  
  const stats = useMemo(() => {
    const played = userPredictions.filter(p => finishedMatches.some(m => m.id === p.matchId));
    const totalPoints = played.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
    const perfectScores = played.filter(p => p.pointsEarned === 5).length; // Assuming 5 is perfect
    const avgPoints = played.length > 0 ? (totalPoints / played.length).toFixed(1) : '0';
    
    // Most predicted score
    const scores: Record<string, number> = {};
    userPredictions.forEach(p => {
      const key = `${p.homeScore}-${p.awayScore}`;
      scores[key] = (scores[key] || 0) + 1;
    });
    const mostPredicted = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { avgPoints, perfectScores, mostPredicted, totalPlayed: played.length };
  }, [userPredictions, finishedMatches]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg glass-card rounded-[3rem] overflow-hidden shadow-2xl border-2 border-white/20"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-[2rem] border-4 border-white shadow-xl overflow-hidden bg-white">
              <img src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`} className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight">{profile.displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Trophy size={14} className="text-theme-primary" />
                <span className="text-sm font-black text-theme-primary">{profile.totalPoints} Punten</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gem. Punten</p>
              <p className="text-2xl font-black font-display text-slate-900">{stats.avgPoints}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Perfecte Scores</p>
              <p className="text-2xl font-black font-display text-slate-900">{stats.perfectScores}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meest Voorspeld</p>
              <p className="text-2xl font-black font-display text-slate-900">{stats.mostPredicted}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Totaal Gespeeld</p>
              <p className="text-2xl font-black font-display text-slate-900">{stats.totalPlayed}</p>
            </div>
          </div>

          {profile.rankHistory && profile.rankHistory.length > 1 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Rank Verloop</p>
              <RankChart history={profile.rankHistory} />
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all"
          >
            Sluiten
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function LeaderboardView({ 
  leaderboard, 
  currentUserId, 
  onCompare,
  predictions,
  matches
}: { 
  leaderboard: UserProfile[]; 
  currentUserId: string;
  onCompare: (userId: string) => void;
  predictions: Prediction[];
  matches: Match[];
}) {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AnimatePresence>
        {selectedProfile && (
          <ProfileModal 
            profile={selectedProfile} 
            predictions={predictions} 
            matches={matches} 
            onClose={() => setSelectedProfile(null)} 
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-[2.5rem] overflow-hidden border-2 border-slate-50"
      >
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight">Klassement</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Wie domineert de WK Prognose 2026?</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live</span>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {leaderboard.length === 0 ? (
          <EmptyState message="Nog geen scores beschikbaar." />
        ) : (
          leaderboard.map((entry, index) => {
            const rank = index + 1;
            const prevRank = entry.previousRank;
            let rankIcon = <Minus size={14} className="text-slate-300" />;
            
            if (prevRank) {
              if (rank < prevRank) rankIcon = <TrendingUp size={14} className="text-emerald-500" />;
              else if (rank > prevRank) rankIcon = <TrendingDown size={14} className="text-red-500" />;
            }

            const isTop3 = rank <= 3;
            const rankColor = rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-slate-300' : rank === 3 ? 'bg-amber-600' : 'bg-slate-100';

            return (
              <motion.div 
                key={entry.uid} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group flex items-center gap-5 p-6 transition-all duration-500 relative cursor-pointer",
                  entry.uid === currentUserId ? "bg-theme-primary/[0.03]" : "hover:bg-slate-50/80"
                )}
                onClick={() => setSelectedProfile(entry)}
              >
                <div className="w-12 flex flex-col items-center justify-center shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center font-black font-display text-lg shadow-lg mb-1 transition-transform group-hover:scale-110",
                    isTop3 ? `${rankColor} text-white shadow-slate-200` : "bg-slate-100 text-slate-400"
                  )}>
                    {rank}
                  </div>
                  {rankIcon}
                </div>
                
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-[1.5rem] border-4 border-white bg-white shadow-xl overflow-hidden group-hover:scale-110 transition-transform duration-500">
                    <img src={entry.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.displayName}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  {isTop3 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full shadow-xl flex items-center justify-center border border-slate-50 animate-bounce">
                      <Trophy size={14} className={cn(rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-400" : "text-amber-600")} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-slate-900 uppercase tracking-tight truncate text-base">{entry.displayName}</p>
                    {entry.favoriteTeam && (
                      <span className="text-[8px] bg-slate-900 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                        {entry.favoriteTeam}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.uid === currentUserId && (
                      <span className="text-[9px] bg-theme-primary text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-theme-primary/20">Jij</span>
                    )}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] truncate">Level {Math.floor(entry.totalPoints / 10) + 1} Pro</p>
                  </div>
                </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-black font-display text-slate-900">{entry.totalPoints}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">pts</span>
                    </div>
                    {entry.uid !== currentUserId && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompare(entry.uid);
                        }}
                        className="p-2.5 glass-card hover:bg-slate-900 hover:text-white transition-all rounded-xl shadow-sm sm:opacity-0 sm:group-hover:opacity-100 opacity-100 active:scale-90"
                        title="Vergelijk met jou"
                      >
                        <Smartphone size={16} />
                      </button>
                    )}
                  </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
    </div>
  );
}

function TeamFlag({ team, size = 24 }: { team: string; size?: number }) {
  const flagMap: Record<string, string> = {
    'België': 'be',
    'Duitsland': 'de',
    'Frankrijk': 'fr',
    'Spanje': 'es',
    'Engeland': 'gb',
    'Italië': 'it',
    'Nederland': 'nl',
    'Portugal': 'pt',
    'Brazilië': 'br',
    'Argentinië': 'ar',
    'Marokko': 'ma',
    'Kroatië': 'hr',
    'Mexico': 'mx',
    'Zuid-Afrika': 'za',
    'Zuid-Korea': 'kr',
    'Canada': 'ca',
    'Qatar': 'qa',
    'Zwitserland': 'ch',
    'Schotland': 'gb-sct',
    'Oostenrijk': 'at',
    'Denemarken': 'dk',
    'Slovenië': 'si',
    'Servië': 'rs',
    'Polen': 'pl',
    'Hongarije': 'hu',
    'Albanië': 'al',
    'Tsjechië': 'cz',
    'Turkije': 'tr',
    'Georgië': 'ge',
    'Slowakije': 'sk',
    'Roemenië': 'ro',
    'Oekraïne': 'ua',
    'Haïti': 'ht',
    'N.t.b.': 'un'
  };

  const code = flagMap[team] || 'un';
  
  if (code === 'un') {
    return <ShieldCheck size={size} className="text-slate-300" />;
  }

  return (
    <img 
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`} 
      alt={team}
      className="object-cover"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  );
}

interface TeamStanding {
  team: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

function calculateStandings(matches: Match[]): Record<string, TeamStanding[]> {
  const groups: Record<string, Record<string, TeamStanding>> = {};

  matches.forEach(match => {
    if (match.type !== 'group' || !match.group) return;
    
    if (!groups[match.group]) groups[match.group] = {};
    if (!groups[match.group][match.homeTeam]) {
      groups[match.group][match.homeTeam] = { team: match.homeTeam, played: 0, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    }
    if (!groups[match.group][match.awayTeam]) {
      groups[match.group][match.awayTeam] = { team: match.awayTeam, played: 0, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    }

    if (match.status !== 'finished') return;

    const { homeTeam, awayTeam, homeScore, awayScore } = match;
    if (homeScore === undefined || awayScore === undefined) return;

    const home = groups[match.group][homeTeam];
    const away = groups[match.group][awayTeam];

    home.played++;
    away.played++;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (homeScore > awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (homeScore < awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.draw++;
      away.draw++;
      home.points += 1;
      away.points += 1;
    }
  });

  const result: Record<string, TeamStanding[]> = {};
  Object.keys(groups).sort().forEach(groupName => {
    result[groupName] = Object.values(groups[groupName]).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  });

  return result;
}

function TournamentStandingsView({ matches }: { matches: Match[] }) {
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'knockout'>('groups');
  const standings = useMemo(() => calculateStandings(matches), [matches]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">Toernooi Standen</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Volg de weg naar de finale</p>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-fit mb-8">
        <button 
          onClick={() => setActiveSubTab('groups')}
          className={cn(
            "px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
            activeSubTab === 'groups' ? "bg-white text-slate-900 shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Groepsfase
        </button>
        <button 
          onClick={() => setActiveSubTab('knockout')}
          className={cn(
            "px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
            activeSubTab === 'knockout' ? "bg-white text-slate-900 shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Knock-outfase
        </button>
      </div>

      {activeSubTab === 'groups' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(standings).map(([groupName, teams]) => {
            const groupTeams = teams as TeamStanding[];
            return (
              <div key={groupName} className="glass-card rounded-[2.5rem] overflow-hidden border-2 border-slate-50">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 font-display uppercase tracking-tight">Groep {groupName}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">Team</th>
                        <th className="px-2 py-4 text-center">G</th>
                        <th className="px-2 py-4 text-center">W</th>
                        <th className="px-2 py-4 text-center">G</th>
                        <th className="px-2 py-4 text-center">V</th>
                        <th className="px-2 py-4 text-center">DV</th>
                        <th className="px-2 py-4 text-center">DT</th>
                        <th className="px-2 py-4 text-center">DS</th>
                        <th className="px-6 py-4 text-center">Pnt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {groupTeams.map((standing, idx) => (
                      <tr key={standing.team} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                            idx < 2 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                               <TeamFlag team={standing.team} size={20} />
                            </div>
                            <span className="text-sm font-bold text-slate-900">{standing.team}</span>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.played}</td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.won}</td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.draw}</td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.lost}</td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.goalsFor}</td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.goalsAgainst}</td>
                        <td className="px-2 py-4 text-center text-xs font-bold text-slate-600">{standing.goalDifference}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-slate-900">{standing.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="glass-card rounded-[2.5rem] p-12 text-center border-2 border-slate-50">
          <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <PieChart className="text-slate-300" size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 font-display uppercase tracking-tight mb-2">Bracket volgt binnenkort</h3>
          <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto">De knock-outfase wordt zichtbaar zodra de groepsfase is afgerond.</p>
        </div>
      )}
    </div>
  );
}

function AdminView({ 
  matches, 
  bonusQuestions, 
  polls,
  tournamentSettings,
  leaderboard
}: { 
  matches: Match[]; 
  bonusQuestions: BonusQuestion[]; 
  polls: Poll[];
  tournamentSettings: TournamentSettings | null;
  leaderboard: UserProfile[];
}) {
  const [adminTab, setAdminTab] = useState<'matches' | 'bonus' | 'polls' | 'tournament' | 'users'>('matches');
  const [isAdding, setIsAdding] = useState(false);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [matchType, setMatchType] = useState<'group' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final'>('group');
  const [group, setGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Tournament settings state
  const [officialTopScorer, setOfficialTopScorer] = useState(tournamentSettings?.officialTopScorer || '');
  const [topScorerPoints, setTopScorerPoints] = useState(tournamentSettings?.topScorerPoints || 10);

  useEffect(() => {
    if (tournamentSettings) {
      setOfficialTopScorer(tournamentSettings.officialTopScorer || '');
      setTopScorerPoints(tournamentSettings.topScorerPoints || 10);
    }
  }, [tournamentSettings]);

  const handleSaveTournamentSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'tournamentSettings', 'results'), {
        officialTopScorer,
        topScorerPoints: Number(topScorerPoints),
        topScorerAwarded: tournamentSettings?.topScorerAwarded || false
      }, { merge: true });
      setSuccess('Toernooi instellingen opgeslagen!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tournamentSettings');
    } finally {
      setSaving(false);
    }
  };

  const handleAwardTopScorerPoints = async () => {
    if (!officialTopScorer) return;
    
    setConfirmAction({
      title: 'Topscorer punten toekennen',
      message: `Weet je zeker dat je ${topScorerPoints} punten wilt toekennen aan iedereen die "${officialTopScorer}" als topscorer heeft?`,
      onConfirm: async () => {
        setConfirmAction(null);
        setSaving(true);
        try {
          const batch = writeBatch(db);
          const profilesSnapshot = await getDocs(collection(db, 'profiles'));
          
          profilesSnapshot.docs.forEach(profileDoc => {
            const profile = profileDoc.data() as UserProfile;
            if (profile.topScorer?.toLowerCase().trim() === officialTopScorer.toLowerCase().trim()) {
              batch.update(doc(db, 'profiles', profileDoc.id), {
                totalPoints: (profile.totalPoints || 0) + Number(topScorerPoints)
              });
            }
          });

          batch.update(doc(db, 'tournamentSettings', 'results'), { topScorerAwarded: true });
          await batch.commit();
          setSuccess('Topscorer punten succesvol toegekend!');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'award-topscorer-points');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const matchData = {
        homeTeam,
        awayTeam,
        date: new Date(date).toISOString(),
        status: 'scheduled' as const,
        type: matchType,
        group: matchType === 'group' ? group : undefined,
      };
      const docRef = doc(collection(db, 'matches'));
      await setDoc(docRef, { id: docRef.id, ...matchData });
      setIsAdding(false);
      setHomeTeam('');
      setAwayTeam('');
      setDate('');
      setMatchType('group');
      setGroup('');
      setSuccess('Match succesvol toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matches');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateResult = async (match: Match, home: number, away: number, fgm?: number) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Update match
      const matchRef = doc(db, 'matches', match.id);
      batch.update(matchRef, {
        homeScore: home,
        awayScore: away,
        firstGoalMinute: fgm ?? null,
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
        // Eerste Doelpunt (Exact minute): +2 points
        
        const actualWinner = home > away ? 'home' : home < away ? 'away' : 'draw';
        const predWinner = pred.homeScore > pred.awayScore ? 'home' : pred.homeScore < pred.awayScore ? 'away' : 'draw';

        if (pred.homeScore === home && pred.awayScore === away) {
          points = 3;
        } else if (actualWinner === predWinner) {
          points = 1;
        }

        // Golden Goal logic
        if (fgm !== undefined && fgm !== null && pred.firstGoalMinute === fgm) {
          points += 2;
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

  const handleResetLeaderboard = async () => {
    setConfirmAction({
      title: 'Klassement Resetten',
      message: 'Weet je zeker dat je ALLE scores wilt resetten naar 0? Dit kan niet ongedaan worden gemaakt.',
      onConfirm: async () => {
        setConfirmAction(null);
        setSaving(true);
        try {
          const batch = writeBatch(db);
          
          // 1. Reset all profiles
          const profilesSnapshot = await getDocs(collection(db, 'profiles'));
          profilesSnapshot.docs.forEach(profileDoc => {
            batch.update(doc(db, 'profiles', profileDoc.id), { totalPoints: 0 });
          });

          // 2. Reset all predictions
          const predsSnapshot = await getDocs(collection(db, 'predictions'));
          predsSnapshot.docs.forEach(predDoc => {
            batch.update(doc(db, 'predictions', predDoc.id), { pointsEarned: 0 });
          });

          // 3. Reset all bonus answers
          const bonusAnswersSnapshot = await getDocs(collection(db, 'bonusAnswers'));
          bonusAnswersSnapshot.docs.forEach(answerDoc => {
            batch.update(doc(db, 'bonusAnswers', answerDoc.id), { pointsEarned: 0 });
          });

          // 4. Reset tournament settings
          batch.update(doc(db, 'tournamentSettings', 'results'), { topScorerAwarded: false });

          await batch.commit();
          setSuccess('Het klassement is volledig gereset!');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'reset-leaderboard');
        } finally {
          setSaving(false);
        }
      }
    });
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

              // Golden Goal logic
              if (match.firstGoalMinute !== undefined && match.firstGoalMinute !== null && pred.firstGoalMinute === match.firstGoalMinute) {
                points += 2;
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
        setSaving(true);
        setError('');
        try {
          await updateDoc(doc(db, 'matches', matchId), {
            status: 'scheduled',
            homeScore: null,
            awayScore: null,
            firstGoalMinute: null
          });
          setSuccess('Match is gereset naar gepland.');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          setError('Fout bij het resetten van de match.');
          handleFirestoreError(error, OperationType.WRITE, 'reset-match');
        } finally {
          setSaving(false);
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
        setSaving(true);
        setError('');
        try {
          await deleteDoc(doc(db, 'matches', id));
          setSuccess('Match succesvol verwijderd.');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          setError('Fout bij het verwijderen van de match.');
          handleFirestoreError(error, OperationType.DELETE, 'matches');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleDeleteUser = async (userId: string) => {
    setConfirmAction({
      title: 'Gebruiker verwijderen',
      message: 'Weet je zeker dat je deze gebruiker en al zijn/haar gegevens wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
      onConfirm: async () => {
        setConfirmAction(null);
        setSaving(true);
        setError('');
        try {
          // Collect all document references to delete
          const refsToDelete: DocumentReference[] = [
            doc(db, 'users', userId),
            doc(db, 'profiles', userId)
          ];
          
          // Helper to fetch all docs for a query (handling potential pagination if needed, though getDocs is usually fine for a few thousand)
          const fetchAllRefs = async (colName: string, field: string, value: string) => {
            const q = query(collection(db, colName), where(field, '==', value));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => d.ref);
          };

          console.log("Collecting data for deletion...");
          
          // Fetch all associated data
          const [
            predictions,
            bonusAnswers,
            pollVotes,
            memberships,
            leagues,
            notifications,
            messages
          ] = await Promise.all([
            fetchAllRefs('predictions', 'userId', userId),
            fetchAllRefs('bonusAnswers', 'userId', userId),
            fetchAllRefs('pollVotes', 'userId', userId),
            fetchAllRefs('leagueMembers', 'userId', userId),
            fetchAllRefs('leagues', 'createdBy', userId),
            fetchAllRefs('notifications', 'userId', userId),
            fetchAllRefs('messages', 'userId', userId)
          ]);

          refsToDelete.push(...predictions, ...bonusAnswers, ...pollVotes, ...memberships, ...notifications, ...messages);

          // For leagues created by user, also delete their members
          for (const leagueRef of leagues) {
            refsToDelete.push(leagueRef);
            const leagueMembers = await fetchAllRefs('leagueMembers', 'leagueId', leagueRef.id);
            refsToDelete.push(...leagueMembers);
          }

          // Remove duplicates and filter out any invalid refs
          const uniqueRefs = Array.from(new Set(refsToDelete.map(r => r.path)))
            .map(path => doc(db, path));

          console.log(`Deleting ${uniqueRefs.length} documents for user ${userId}`);

          // Delete from Firebase Authentication via our backend API
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            try {
              const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId })
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.warn("Auth deletion failed or was already handled:", errorData);
                // We continue with Firestore deletion even if Auth deletion fails 
                // (e.g. if user was already deleted from Auth manually)
              } else {
                console.log("User deleted from Firebase Authentication successfully");
              }
            } catch (authErr) {
              console.error("Error calling delete-user API:", authErr);
            }
          }

          // Delete in batches of 500
          let deletedCount = 0;
          for (let i = 0; i < uniqueRefs.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = uniqueRefs.slice(i, i + 500);
            chunk.forEach(ref => batch.delete(ref));
            await batch.commit();
            deletedCount += chunk.length;
            console.log(`Deleted batch ${Math.floor(i / 500) + 1} (${deletedCount}/${uniqueRefs.length})`);
          }

          setSuccess(`Gebruiker en ${deletedCount} bijbehorende documenten succesvol verwijderd.`);
          setTimeout(() => setSuccess(''), 5000);
        } catch (error) {
          console.error("Error deleting user:", error);
          setError('Kon gebruiker niet volledig verwijderen. Sommige gegevens zijn mogelijk achtergebleven.');
          handleFirestoreError(error, OperationType.DELETE, 'users');
        } finally {
          setSaving(false);
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
        <button 
          onClick={() => setAdminTab('tournament')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            adminTab === 'tournament' ? "bg-delijn-black text-white" : "bg-white text-stone-500 border border-stone-200"
          )}
        >
          <Trophy size={18} />
          Toernooi
        </button>
        <button 
          onClick={() => setAdminTab('users')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
            adminTab === 'users' ? "bg-delijn-black text-white" : "bg-white text-stone-500 border border-stone-200"
          )}
        >
          <UserIcon size={18} />
          Gebruikers
        </button>
      </div>

      {success && (
        <div className="bg-delijn-yellow/10 border border-delijn-yellow/20 text-delijn-black p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in">
          <CheckCircle2 size={20} />
          <p className="font-bold">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in">
          <AlertCircle size={20} />
          <p className="font-bold">{error}</p>
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

      {adminTab === 'matches' ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Wedstrijdbeheer</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleResetLeaderboard}
                disabled={saving}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50"
                title="Reset alle scores naar 0"
              >
                <RefreshCw size={18} />
                Reset Klassement
              </button>
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
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Type</label>
                  <select 
                    value={matchType}
                    onChange={e => setMatchType(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
                  >
                    <option value="group">Groepsfase</option>
                    <option value="round_of_16">Achtste Finale</option>
                    <option value="quarter_final">Kwartfinale</option>
                    <option value="semi_final">Halve Finale</option>
                    <option value="final">Finale</option>
                  </select>
                </div>
                {matchType === 'group' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Groep</label>
                    <input 
                      required
                      value={group}
                      onChange={e => setGroup(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
                      placeholder="Bijv. A"
                    />
                  </div>
                )}
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
                saving={saving}
              />
            ))}
          </div>
        </>
      ) : adminTab === 'bonus' ? (
        <AdminBonusQuestionsView 
          questions={bonusQuestions} 
          setConfirmAction={setConfirmAction}
          setSuccess={setSuccess}
          setError={setError}
        />
      ) : adminTab === 'polls' ? (
        <AdminPollsView 
          polls={polls} 
          setConfirmAction={setConfirmAction}
          setSuccess={setSuccess}
          setError={setError}
        />
      ) : adminTab === 'users' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Gebruikers Beheer</h2>
            <div className="grid gap-4">
              {leaderboard.map(userProfile => (
                <div key={userProfile.uid} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-stone-200">
                      <img src={userProfile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.displayName}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{userProfile.displayName}</p>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{userProfile.totalPoints} Punten</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteUser(userProfile.uid)}
                    disabled={saving}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Gebruiker verwijderen"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Toernooi Resultaten</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Officiële Topscorer</label>
                <input 
                  value={officialTopScorer}
                  onChange={e => setOfficialTopScorer(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
                  placeholder="Bijv. Kylian Mbappé"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Punten voor Topscorer</label>
                <input 
                  type="number"
                  value={topScorerPoints}
                  onChange={e => setTopScorerPoints(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleSaveTournamentSettings}
                disabled={saving}
                className="flex-1 bg-delijn-black text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
              </button>
              <button 
                onClick={handleAwardTopScorerPoints}
                disabled={saving || !officialTopScorer || tournamentSettings?.topScorerAwarded}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                  tournamentSettings?.topScorerAwarded 
                    ? "bg-green-100 text-green-600 cursor-not-allowed" 
                    : "bg-delijn-yellow text-delijn-black hover:bg-yellow-500 disabled:opacity-50"
                )}
              >
                <CheckCircle2 size={18} />
                {tournamentSettings?.topScorerAwarded ? 'Punten Toegekend' : 'Punten Toekennen'}
              </button>
            </div>
            
            {tournamentSettings?.topScorerAwarded && (
              <p className="mt-4 text-sm text-stone-500 italic text-center">
                Let op: Punten zijn al een keer toegekend. Wees voorzichtig met opnieuw toekennen.
              </p>
            )}
          </div>

          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 border-dashed">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Info size={18} className="text-stone-400" />
              Hoe werkt dit?
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              Vul de naam van de officiële topscorer in en bepaal hoeveel punten gebruikers krijgen die dit correct hebben voorspeld. 
              De vergelijking is niet hoofdlettergevoelig en negeert spaties aan het begin/eind. 
              Wanneer je op "Punten Toekennen" klikt, worden de punten direct bij het totaal van de betreffende gebruikers opgeteld.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const AdminMatchCard: React.FC<{ 
  match: Match; 
  onUpdate: (m: Match, h: number, a: number, fgm?: number) => void; 
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
  saving?: boolean;
}> = ({ match, onUpdate, onDelete, onReset, saving }) => {
  const [h, setH] = useState(match.homeScore?.toString() || '');
  const [a, setA] = useState(match.awayScore?.toString() || '');
  const [fgm, setFgm] = useState(match.firstGoalMinute?.toString() || '');
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    if (h === '' || a === '') return;
    setUpdating(true);
    try {
      await onUpdate(match, parseInt(h), parseInt(a), fgm !== '' ? parseInt(fgm) : undefined);
    } finally {
      setUpdating(false);
    }
  };

  const isBusy = updating || saving;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
    >
      <div className="flex-1">
        <p className="text-xs font-bold text-stone-400 mb-1">
          {format(new Date(match.date), 'd MMM yyyy HH:mm')}
          {match.type && (
            <span className="ml-2 text-delijn-black bg-stone-100 px-2 py-0.5 rounded text-[10px]">
              {match.type === 'group' ? `Groep ${match.group}` : match.type.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
        </p>
        <p className="font-bold text-lg">{match.homeTeam} vs {match.awayTeam}</p>
        <div className="flex items-center gap-3 mt-1">
          <p className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", match.status === 'finished' ? "bg-delijn-yellow text-delijn-black" : "bg-amber-100 text-amber-700")}>
            {match.status === 'finished' ? 'Afgelopen' : 'Gepland'}
          </p>
          {match.status === 'finished' && (
            <button 
              onClick={() => onReset(match.id)}
              disabled={isBusy}
              className="text-[10px] font-bold text-stone-400 hover:text-stone-600 underline disabled:opacity-50"
            >
              Reset naar gepland
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={h} 
              disabled={isBusy}
              onChange={e => setH(e.target.value)}
              className="w-12 h-12 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none disabled:opacity-50"
              placeholder="H"
            />
            <span className="text-stone-400">-</span>
            <input 
              type="number" 
              value={a} 
              disabled={isBusy}
              onChange={e => setA(e.target.value)}
              className="w-12 h-12 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none disabled:opacity-50"
              placeholder="A"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <label className="text-[8px] font-bold text-stone-400 uppercase">Eerste Doelpunt</label>
          <input 
            type="number" 
            value={fgm} 
            disabled={isBusy}
            onChange={e => setFgm(e.target.value)}
            className="w-16 h-10 text-center bg-stone-50 border border-stone-200 rounded-xl font-bold focus:ring-2 focus:ring-delijn-yellow outline-none disabled:opacity-50"
            placeholder="Min"
          />
        </div>
        
        <button 
          onClick={handleUpdate}
          disabled={isBusy || h === '' || a === ''}
          className="bg-delijn-black text-white px-4 py-2 rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50"
        >
          {updating ? '...' : 'Uitslag'}
        </button>

        <button 
          onClick={() => onDelete(match.id)}
          disabled={isBusy}
          className="p-2 text-stone-300 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </motion.div>
  );
};

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-16 rounded-[3rem] border-2 border-dashed border-slate-200 text-center bg-slate-50/30"
    >
      <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-200/50 group-hover:scale-110 transition-transform duration-500">
        <Info size={40} className="text-slate-200" />
      </div>
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] leading-relaxed max-w-[200px] mx-auto">{message}</p>
    </motion.div>
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
    <div className="glass-card p-6 rounded-[2.5rem] mb-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-slate-200/50 border-2 border-slate-50 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-slate-200">
          <Timer className="text-theme-primary animate-pulse" size={28} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Next Match</p>
          <p className="font-black text-lg text-slate-900 uppercase tracking-tight">{nextMatch.homeTeam} <span className="text-slate-200 mx-1">vs</span> {nextMatch.awayTeam}</p>
        </div>
      </div>
      <div className="flex flex-col items-center sm:items-end">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Kickoff In</p>
        <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
          <p className="font-display font-black text-2xl text-slate-900 tracking-tighter">{timeLeft}</p>
        </div>
      </div>
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

function SettingsView({ 
  profile, 
  user, 
  onThemePreview 
}: { 
  profile: UserProfile | null; 
  user: UserPrivate;
  onThemePreview: (team: string | null) => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [favoriteTeam, setFavoriteTeam] = useState(profile?.favoriteTeam || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [topScorer, setTopScorer] = useState(profile?.topScorer || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    onThemePreview(favoriteTeam);
    return () => onThemePreview(null);
  }, [favoriteTeam, onThemePreview]);

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
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Toby",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bear",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Duke",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ginger",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Honey",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lola",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Misty",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Peanut",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Princess",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Rocky",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Simba"
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        displayName,
        favoriteTeam,
        avatarUrl,
        topScorer
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
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Gouden Schoen (Topscorer)</label>
            <input 
              type="text"
              placeholder="Wie wordt de topscorer?"
              value={topScorer}
              onChange={e => setTopScorer(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-delijn-yellow font-bold"
            />
            <p className="text-[10px] text-stone-400 mt-1 italic">Voorspel de topscorer van het toernooi voor bonuspunten!</p>
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
                    <div className="absolute top-1 right-1 bg-theme-primary text-theme-text rounded-full p-0.5">
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

      {profile?.rankHistory && profile.rankHistory.length >= 2 && (
        <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-delijn-yellow" />
            Jouw Klassement Verloop
          </h3>
          <RankChart history={profile.rankHistory} />
        </section>
      )}
    </div>
  );
}

function AdminPollsView({ 
  polls, 
  setConfirmAction,
  setSuccess,
  setError
}: { 
  polls: Poll[];
  setConfirmAction: (action: { title: string; message: string; onConfirm: () => void } | null) => void;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
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
      setSuccess('Poll succesvol toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Fout bij het toevoegen van de poll.');
      handleFirestoreError(error, OperationType.WRITE, 'polls');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmAction({
      title: 'Poll verwijderen',
      message: 'Weet je zeker dat je deze poll wilt verwijderen?',
      onConfirm: async () => {
        setConfirmAction(null);
        setSaving(true);
        setError('');
        try {
          await deleteDoc(doc(db, 'polls', id));
          setSuccess('Poll succesvol verwijderd.');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          setError('Fout bij het verwijderen van de poll.');
          handleFirestoreError(error, OperationType.DELETE, 'polls');
        } finally {
          setSaving(false);
        }
      }
    });
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
              disabled={saving}
              className="p-2 text-stone-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminBonusQuestionsView({ 
  questions,
  setConfirmAction,
  setSuccess,
  setError
}: { 
  questions: BonusQuestion[];
  setConfirmAction: (action: { title: string; message: string; onConfirm: () => void } | null) => void;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [newQ, setNewQ] = useState('');
  const [newP, setNewP] = useState('5');
  const [newD, setNewD] = useState('');
  const [newO, setNewO] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newQ || !newD || saving) return;
    setSaving(true);
    setError('');
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
      setSuccess('Bonusvraag succesvol toegevoegd!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error("Error adding bonus question:", error);
      setError('Fout bij het toevoegen van de bonusvraag.');
      handleFirestoreError(error, OperationType.WRITE, 'bonusQuestions');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmAction({
      title: 'Bonusvraag verwijderen',
      message: 'Weet je zeker dat je deze bonusvraag wilt verwijderen?',
      onConfirm: async () => {
        setConfirmAction(null);
        setSaving(true);
        setError('');
        try {
          await deleteDoc(doc(db, 'bonusQuestions', id));
          setSuccess('Bonusvraag succesvol verwijderd.');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
          setError('Fout bij het verwijderen van de bonusvraag.');
          handleFirestoreError(error, OperationType.DELETE, 'bonusQuestions');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleUpdateStatus = async (id: string, status: BonusQuestion['status'], correctAnswer?: string) => {
    if (saving) return;
    const update: any = { status };
    if (correctAnswer) update.correctAnswer = correctAnswer;
    setSaving(true);
    setError('');
    try {
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
      setSuccess('Status succesvol bijgewerkt.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Fout bij het bijwerken van de status.');
      handleFirestoreError(error, OperationType.UPDATE, 'bonusQuestions');
    } finally {
      setSaving(false);
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
            disabled={saving || !newQ || !newD}
            className="bg-delijn-black text-white py-3 rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50"
          >
            {saving ? 'Bezig...' : 'Vraag Toevoegen'}
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
              <button 
                onClick={() => handleDelete(q.id)} 
                disabled={saving}
                className="text-stone-300 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              {q.status === 'open' && (
                <button 
                  onClick={() => handleUpdateStatus(q.id, 'closed')} 
                  disabled={saving}
                  className="bg-stone-100 text-stone-600 px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Sluiten
                </button>
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
                    disabled={saving}
                    className="bg-theme-primary text-theme-text px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50"
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

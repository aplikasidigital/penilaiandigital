import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PublicLanding } from './components/PublicLanding';
import { AdminDashboard } from './components/AdminDashboard';
import { JuriDashboard } from './components/JuriDashboard';
import { VoterDashboard } from './components/VoterDashboard';
import { DanaPaymentModal } from './components/DanaPaymentModal';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';
import { StorageService } from './services/storage';
import { soundService } from './services/sound';
import { signInWithGoogle, signOutFromSupabase, onAuthStateChange } from './services/supabaseClient.js';
import { EventConfig, User } from './types';
import {
  Lock,
  User as UserIcon,
  X,
  LogIn,
  Shield,
  Award,
  Vote,
  Sparkles,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  UserPlus
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [eventConfig, setEventConfig] = useState<EventConfig>(() => StorageService.getEventConfig());
  const [currentView, setCurrentView] = useState<'public' | 'dashboard'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('simpel_active_view') : null;
    const user = StorageService.getCurrentUser();
    if (saved === 'dashboard' && user) return 'dashboard';
    if (saved === 'public') return 'public';
    return user ? 'dashboard' : 'public';
  });

  const changeView = (view: 'public' | 'dashboard') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('simpel_active_view', view);
    }
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDanaModalOpen, setIsDanaModalOpen] = useState(false);

  // Login form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const refreshState = useCallback(() => {
    setCurrentUser(StorageService.getCurrentUser());
    setEventConfig(StorageService.getEventConfig());
  }, []);

  useEffect(() => {
    // Sinkronisasi otomatis dari database Supabase saat aplikasi dibuka
    StorageService.syncFromSupabase().then(() => {
      refreshState();
    });

    const cleanup = StorageService.onRemoteChange((type) => {
      if (!type || type === 'all_restored' || type === 'cloud_synced') {
        const nextUser = StorageService.getCurrentUser();
        const nextCfg = StorageService.getEventConfig();
        setCurrentUser(prev => (JSON.stringify(prev) === JSON.stringify(nextUser) ? prev : nextUser));
        setEventConfig(prev => (JSON.stringify(prev) === JSON.stringify(nextCfg) ? prev : nextCfg));
        return;
      }
      if (type === 'auth' || type === 'users') {
        const nextUser = StorageService.getCurrentUser();
        setCurrentUser(prev => (JSON.stringify(prev) === JSON.stringify(nextUser) ? prev : nextUser));
      }
      if (type === 'event_config') {
        const nextCfg = StorageService.getEventConfig();
        setEventConfig(prev => (JSON.stringify(prev) === JSON.stringify(nextCfg) ? prev : nextCfg));
      }
    });

    // Listen to Supabase Google OAuth state changes
    const unsubscribeAuth = onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const sbUser = session.user;
        const existingUsers = StorageService.getUsers();
        const userEmail = sbUser.email || '';
        const userName =
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          userEmail.split('@')[0] ||
          'Pengguna Google';

        let matchedUser = existingUsers.find(
          u => u.id === sbUser.id || (userEmail && (u.username === userEmail || u.phone === userEmail))
        );

        if (!matchedUser) {
          matchedUser = {
            id: sbUser.id,
            username: userEmail || `google_${sbUser.id.substring(0, 8)}`,
            name: userName,
            role: 'voter',
            phone: sbUser.phone || userEmail,
            avatarUrl: sbUser.user_metadata?.avatar_url || '',
            voteBalance: 0,
            createdAt: new Date().toISOString(),
          };
          StorageService.saveUsers([...existingUsers, matchedUser]);
        }

        StorageService.setCurrentUser(matchedUser);
        setCurrentUser(matchedUser);
        setIsLoginModalOpen(false);
        changeView('dashboard');
        soundService.playSuccessFanfare();
      }
    });

    return () => {
      cleanup();
      unsubscribeAuth();
    };
  }, [refreshState]);

  const handleLogout = () => {
    soundService.playClick();
    signOutFromSupabase().catch(() => {});
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    changeView('public');
  };

  const handleGoogleSignIn = async () => {
    soundService.playClick();
    setLoginError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const errStr = typeof err === 'string' ? err : (err?.message || err?.msg || JSON.stringify(err));
      if (
        errStr.includes('Unsupported provider') ||
        errStr.includes('provider is not enabled') ||
        errStr.includes('validation_failed')
      ) {
        setLoginError('Provider Google belum diaktifkan pada Dashboard Supabase Anda (Authentication > Providers > Google). Silakan gunakan login username & kata sandi di atas.');
      } else {
        setLoginError(err?.message || 'Gagal terhubung ke Google. Silakan gunakan akun username & kata sandi.');
      }
    }
  };

  const handleUpdateEventConfig = useCallback((cfg: EventConfig) => {
    setEventConfig(cfg);
    StorageService.saveEventConfig(cfg);
  }, []);

  const handleOpenLogin = () => {
    soundService.playClick();
    setLoginError('');
    setIsLoginModalOpen(true);
  };

  const handleOpenVotingModal = () => {
    soundService.playClick();
    if (!currentUser) {
      // Prompt user to login or quick register as voter first
      setAuthMode('login');
      setIsLoginModalOpen(true);
    } else {
      setIsDanaModalOpen(true);
    }
  };

  const handleLoginFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    soundService.playClick();

    if (authMode === 'login') {
      const users = StorageService.getUsers();
      const matched = users.find(
        u => u.username.toLowerCase() === usernameInput.trim().toLowerCase() && u.password === passwordInput
      );

      if (!matched) {
        setLoginError('Nama pengguna atau kata sandi tidak cocok. Silakan periksa kembali.');
        return;
      }

      soundService.playSuccessFanfare();
      StorageService.setCurrentUser(matched);
      setCurrentUser(matched);
      setIsLoginModalOpen(false);
      setUsernameInput('');
      setPasswordInput('');
      changeView('dashboard');
    } else {
      // Register new Voter account
      if (!usernameInput.trim() || !passwordInput.trim() || !nameInput.trim()) {
        setLoginError('Mohon lengkapi nama lengkap, username, dan password.');
        return;
      }

      const users = StorageService.getUsers();
      if (users.some(u => u.username.toLowerCase() === usernameInput.trim().toLowerCase())) {
        setLoginError('Username ini telah digunakan. Gunakan username lain.');
        return;
      }

      const newUser: User = {
        id: `usr_${Date.now()}`,
        username: usernameInput.trim(),
        password: passwordInput,
        name: nameInput.trim(),
        role: 'voter',
        phone: phoneInput.trim() || '081200000000',
        voteBalance: 0,
        createdAt: new Date().toISOString(),
      };

      const updated = [...users, newUser];
      StorageService.saveUsers(updated);
      StorageService.setCurrentUser(newUser);
      setCurrentUser(newUser);
      soundService.playSuccessFanfare();
      setIsLoginModalOpen(false);
      setUsernameInput('');
      setPasswordInput('');
      setNameInput('');
      setPhoneInput('');
      changeView('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Global Navbar */}
      <Navbar
        currentUser={currentUser}
        eventConfig={eventConfig}
        currentView={currentView}
        onNavigateView={(view) => {
          soundService.playClick();
          changeView(view);
        }}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {currentView === 'public' || !currentUser ? (
          <PublicLanding
            eventConfig={eventConfig}
            onOpenLogin={handleOpenLogin}
            onOpenVotingModal={handleOpenVotingModal}
          />
        ) : (
          <>
            {(currentUser.role === 'super_admin' ||
              currentUser.role === 'shadow_admin' ||
              currentUser.role === 'operator' ||
              currentUser.role === 'bendahara') && (
              <AdminDashboard
                currentUser={currentUser}
                eventConfig={eventConfig}
                onUpdateEventConfig={handleUpdateEventConfig}
                onLogout={handleLogout}
                onViewPublic={() => {
                  soundService.playClick();
                  changeView('public');
                }}
              />
            )}

            {currentUser.role === 'juri' && (
              <JuriDashboard
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}

            {currentUser.role === 'voter' && (
              <VoterDashboard
                currentUser={currentUser}
                eventConfig={eventConfig}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* DANA Payment Topup Modal */}
      {currentUser && (
        <DanaPaymentModal
          currentUser={currentUser}
          eventConfig={eventConfig}
          isOpen={isDanaModalOpen}
          onClose={() => setIsDanaModalOpen(false)}
          onSuccess={() => {
            setIsDanaModalOpen(false);
            refreshState();
          }}
        />
      )}

      {/* Global Background Music Player (Autoplay & Looping) */}
      <BackgroundMusicPlayer eventConfig={eventConfig} />

      {/* Login & Role Selection Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-stone-900 border border-amber-600/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-200 font-display">
                  {authMode === 'login' ? 'Masuk ke Sistem Digital' : 'Daftar Akun Voter Baru'}
                </h3>
                <p className="text-xs text-stone-400">
                  {authMode === 'login'
                    ? 'Masukkan username dan kata sandi resmi Anda untuk melanjutkan'
                    : 'Daftar untuk melakukan voting peserta terfavorit'}
                </p>
              </div>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginFormSubmit} className="space-y-3.5 mb-6">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      placeholder="Contoh: Rian Pratama"
                      className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Nomor HP / WhatsApp (Aktif)
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:border-amber-500 outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 focus:border-amber-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                {authMode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk Sekarang</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar & Masuk</span>
                  </>
                )}
              </button>
            </form>


            <div className="flex items-center justify-between text-xs text-stone-400 pt-3 border-t border-stone-800">
              <span>
                {authMode === 'login' ? 'Belum punya akun Voter?' : 'Sudah punya akun?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setLoginError('');
                }}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                {authMode === 'login' ? 'Daftar Sebagai Voter' : 'Masuk di sini'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

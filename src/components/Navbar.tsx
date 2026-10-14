import React from 'react';
import { User, EventConfig } from '../types';
import { soundService } from '../services/sound';
import {
  Trophy,
  LayoutDashboard,
  Globe,
  LogIn,
  LogOut,
  Shield,
  Coins,
  User as UserIcon,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  eventConfig: EventConfig;
  currentView: 'public' | 'dashboard';
  onNavigateView: (view: 'public' | 'dashboard') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  eventConfig,
  currentView,
  onNavigateView,
  onOpenLogin,
  onLogout,
}) => {
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'shadow_admin':
        return { label: 'Co-Admin', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'juri':
        return { label: 'Dewan Juri', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'voter':
        return { label: 'Voter Resmi', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      default:
        return { label: 'Pengunjung', bg: 'bg-stone-700/30 text-stone-300 border-stone-600/30' };
    }
  };

  const roleInfo = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-stone-950/90 border-b border-stone-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Title */}
          <div
            onClick={() => onNavigateView('public')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/50 group-hover:scale-105 transition-all">
              {eventConfig.logoUrl ? (
                <img
                  src={eventConfig.logoUrl}
                  alt="Logo"
                  className="w-7 h-7 object-contain rounded-md"
                />
              ) : (
                <Trophy className="w-5 h-5 text-stone-950 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                  {eventConfig.judulKegiatan || 'S-IMPEL DIGITAL'}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-2.5 h-2.5" /> LIVE
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate max-w-[200px] sm:max-w-xs hidden sm:block">
                {eventConfig.subJudul || 'Sistem Penilaian Digital & Voting Berbayar'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => onNavigateView('public')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'public'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Papan Klasemen</span>
              <span className="sm:hidden">Klasemen</span>
            </button>

            {currentUser && (
              <button
                onClick={() => onNavigateView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            )}
          </nav>

          {/* Right Action: User profile or Login */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Voter Saldo Coin */}
                {currentUser.role === 'voter' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>{currentUser.voteBalance ?? 0}</span>
                    <span className="text-[10px] text-amber-400/80">Votes</span>
                  </div>
                )}

                {/* User Info Badge */}
                <div className="hidden md:flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-stone-200">
                      {currentUser.name}
                    </span>
                    {roleInfo && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${roleInfo.bg}`}>
                        {roleInfo.label}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400">
                    @{currentUser.username}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="Keluar dari akun"
                  className="p-2 text-stone-400 hover:text-red-400 hover:bg-stone-900 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Sistem</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

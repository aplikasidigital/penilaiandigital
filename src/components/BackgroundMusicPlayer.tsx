import React, { useState, useEffect, useRef } from 'react';
import { EventConfig } from '../types';
import { soundService } from '../services/sound';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface BackgroundMusicPlayerProps {
  eventConfig: EventConfig;
}

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({ eventConfig }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(soundService.isBgmPlaying());
  const [isMuted, setIsMuted] = useState<boolean>(soundService.getIsMuted());
  const [volume, setVolume] = useState<number>(soundService.getBgmVolume());
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showVolumePopup, setShowVolumePopup] = useState<boolean>(false);
  const hasAttemptedRef = useRef(false);

  // Sync state with soundService
  useEffect(() => {
    const unsubscribe = soundService.subscribe(() => {
      setIsPlaying(soundService.isBgmPlaying());
      setIsMuted(soundService.getIsMuted());
      setVolume(soundService.getBgmVolume());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Autoplay handler with browser autoplay policy fallback
  useEffect(() => {
    if (eventConfig.bgmEnabled === false) {
      soundService.stopGlobalBGM();
      return;
    }

    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    const startBgm = async () => {
      const ok = await soundService.startGlobalBGM(eventConfig.bgmAudioUrl || '');
      if (!ok) {
        // Browser blocked autoplay without user gesture
        setIsAutoplayBlocked(true);

        const handleUserGesture = () => {
          soundService.resumeBGM().then((started) => {
            if (started) {
              setIsAutoplayBlocked(false);
            }
          });
          cleanupGestureListeners();
        };

        const cleanupGestureListeners = () => {
          window.removeEventListener('pointerdown', handleUserGesture);
          window.removeEventListener('keydown', handleUserGesture);
          window.removeEventListener('touchstart', handleUserGesture);
        };

        window.addEventListener('pointerdown', handleUserGesture, { once: true });
        window.addEventListener('keydown', handleUserGesture, { once: true });
        window.addEventListener('touchstart', handleUserGesture, { once: true });
      } else {
        setIsAutoplayBlocked(false);
      }
    };

    startBgm();
  }, [eventConfig.bgmAudioUrl, eventConfig.bgmEnabled]);

  const handleTogglePlay = async () => {
    soundService.playClick();
    if (isPlaying) {
      soundService.pauseBGM();
    } else {
      const ok = await soundService.resumeBGM();
      if (ok) {
        setIsAutoplayBlocked(false);
      }
    }
  };

  const handleToggleMute = () => {
    soundService.playClick();
    soundService.setMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundService.setBgmVolume(val);
    if (isMuted && val > 0) {
      soundService.setMuted(false);
    }
  };

  const handlePromptClick = async () => {
    soundService.playClick();
    const ok = await soundService.resumeBGM();
    if (ok) {
      setIsAutoplayBlocked(false);
    }
  };

  if (eventConfig.bgmEnabled === false) return null;

  return (
    <aside aria-label="Pemutar Musik Latar Belakang" className="fixed bottom-4 right-4 z-40 select-none print:hidden font-sans">
      {/* Autoplay Blocked Notification Pill */}
      {isAutoplayBlocked && (
        <div
          role="button"
          tabIndex={0}
          onClick={handlePromptClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePromptClick();
            }
          }}
          className="mb-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-full shadow-xl shadow-amber-950/60 border border-amber-300 flex items-center gap-2 cursor-pointer transition-all animate-bounce"
        >
          <Music className="w-4 h-4 animate-spin text-stone-950 shrink-0" style={{ animationDuration: '3s' }} />
          <span>Putar Musik Latar Belakang</span>
          <Sparkles className="w-3.5 h-3.5 text-stone-950 shrink-0" />
        </div>
      )}

      {/* Floating Audio Controller Badge */}
      <div className="bg-stone-900/90 hover:bg-stone-900 backdrop-blur-md border border-stone-700/80 rounded-2xl shadow-2xl p-2.5 transition-all text-stone-200">
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button with mini equalizer animation */}
          <button
            type="button"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Jeda Musik Latar' : 'Putar Musik Latar'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40 hover:bg-amber-400'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Equalizer animation and Track Info */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
            className="flex items-center gap-2.5 px-1.5 cursor-pointer max-w-[150px] sm:max-w-[200px]"
          >
            {/* 4 jumping equalizer bars */}
            <div className="flex items-end gap-0.5 h-4 w-4">
              <span
                className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'animate-pulse h-4' : 'h-1.5'
                }`}
              />
              <span
                className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'animate-pulse h-2.5 delay-100' : 'h-1'
                }`}
              />
              <span
                className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'animate-pulse h-4 delay-200' : 'h-2'
                }`}
              />
              <span
                className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'animate-pulse h-3 delay-150' : 'h-1'
                }`}
              />
            </div>

            <div className="truncate">
              <div className="text-[11px] font-bold text-stone-100 truncate flex items-center gap-1">
                <span>Musik Latar</span>
                {isPlaying && !isMuted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                )}
              </div>
              <div className="text-[9px] text-stone-400 truncate">
                {isPlaying ? (isMuted ? 'Senyap (Muted)' : 'Sedang Diputar') : 'Dijeda'}
              </div>
            </div>
          </div>

          {/* Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? 'Bunyikan (Unmute)' : 'Matikan Suara (Mute)'}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40 hover:bg-rose-900/60'
                : 'hover:bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Expand / Minimize toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Sembunyikan Pengaturan' : 'Buka Pengaturan'}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Controls: Volume Slider & Options */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-stone-800 space-y-2 px-1">
            <div className="flex items-center justify-between text-[10px] text-stone-400">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-amber-400" />
                Volume Musik:
              </span>
              <span className="font-mono text-amber-300 font-bold">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
            />

            <div className="text-[9px] text-stone-400 italic text-center pt-0.5">
              Musik otomatis diputar berulang untuk kenyamanan peserta & dewan juri
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

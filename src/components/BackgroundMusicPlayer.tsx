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
  Sparkles,
  Radio
} from 'lucide-react';

interface BackgroundMusicPlayerProps {
  eventConfig: EventConfig;
}

// Helper to extract YouTube Video ID
const extractYouTubeId = (url?: string): string | null => {
  if (!url || !url.trim()) return 'qMIQC7_AkIg';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({ eventConfig }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundService.getIsMuted());
  const [volume, setVolume] = useState<number>(eventConfig.bgmVolume ?? soundService.getBgmVolume() ?? 0.35);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [trackTitle, setTrackTitle] = useState<string>('Via Vallen - Meraih Bintang');

  const ytPlayerRef = useRef<any>(null);
  const isYouTubeModeRef = useRef<boolean>(true);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);

  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  const bgmUrl = eventConfig.bgmAudioUrl || 'https://www.youtube.com/watch?v=qMIQC7_AkIg';
  const ytVideoId = extractYouTubeId(bgmUrl);

  // Sync state with soundService when non-YouTube mode is used
  useEffect(() => {
    const unsubscribe = soundService.subscribe(() => {
      if (!isYouTubeModeRef.current) {
        setIsPlaying(soundService.isBgmPlaying());
        setIsMuted(soundService.getIsMuted());
        setVolume(soundService.getBgmVolume());
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize and manage YouTube Player API or Direct Audio fallback
  useEffect(() => {
    if (eventConfig.bgmEnabled === false) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      soundService.stopGlobalBGM();
      setIsPlaying(false);
      return;
    }

    // 1. YouTube Mode (Default for Via Vallen - Meraih Bintang)
    if (ytVideoId) {
      isYouTubeModeRef.current = true;
      setTrackTitle('Via Vallen - Meraih Bintang');

      const setupYouTubePlayer = () => {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }

        const ytContainer = document.getElementById('youtube-bgm-container');
        if (!ytContainer) return;

        try {
          const player = new (window as any).YT.Player('youtube-bgm-container', {
            height: '100',
            width: '100',
            videoId: ytVideoId,
            playerVars: {
              autoplay: 1,
              loop: 1,
              playlist: ytVideoId, // Crucial for single video looping in YouTube Player
              controls: 0,
              disablekb: 1,
              playsinline: 1,
              modestbranding: 1,
              fs: 0,
              rel: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                ytPlayerRef.current = event.target;
                const volPct = Math.round(volumeRef.current * 100);
                event.target.setVolume(volPct);
                if (isMutedRef.current) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }

                try {
                  event.target.playVideo();
                } catch {}

                // Verify playback status after delay to detect browser autoplay blockage
                setTimeout(() => {
                  try {
                    const state = event.target.getPlayerState();
                    if (state === 1) { // 1 = PLAYING
                      setIsPlaying(true);
                      setIsAutoplayBlocked(false);
                    } else {
                      // Autoplay blocked by browser policy without user gesture
                      setIsAutoplayBlocked(true);
                    }
                  } catch {
                    setIsAutoplayBlocked(true);
                  }
                }, 1200);
              },
              onStateChange: (event: any) => {
                if (event.data === 1) { // PLAYING
                  setIsPlaying(true);
                  setIsAutoplayBlocked(false);
                } else if (event.data === 2) { // PAUSED
                  setIsPlaying(false);
                } else if (event.data === 0) { // ENDED - Guarantee infinite loop
                  event.target.playVideo();
                }
              },
              onError: (err: any) => {
                console.warn('YouTube BGM Player notice:', err);
                // Fallback to internal ambient loop if YouTube cannot load
                soundService.startGlobalBGM('');
              },
            },
          });
        } catch (e) {
          console.warn('Failed to construct YouTube Player', e);
        }
      };

      // Load YouTube API script if not present
      if (!(window as any).YT || !(window as any).YT.Player) {
        const existingScript = document.getElementById('youtube-iframe-api-script');
        if (!existingScript) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }

        const prevReady = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (typeof prevReady === 'function') prevReady();
          setupYouTubePlayer();
        };
      } else {
        setupYouTubePlayer();
      }

      // Safe Browser Autoplay Policy: Listen for the user's first gesture anywhere on the page
      const handleFirstInteraction = () => {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(Math.round(volumeRef.current * 100));
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
            setIsAutoplayBlocked(false);
          } catch {}
        }
        cleanupInteractionListeners();
      };

      const cleanupInteractionListeners = () => {
        window.removeEventListener('pointerdown', handleFirstInteraction);
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };

      window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });
      window.addEventListener('touchstart', handleFirstInteraction, { once: true });

      return () => {
        cleanupInteractionListeners();
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }
      };
    } else {
      // 2. Direct HTML5 Audio Mode (Custom uploaded audio files)
      isYouTubeModeRef.current = false;
      setTrackTitle('Musik Latar Resmi');

      const startDirectBgm = async () => {
        const ok = await soundService.startGlobalBGM(bgmUrl);
        if (!ok) {
          setIsAutoplayBlocked(true);

          const handleUserGesture = () => {
            soundService.resumeBGM().then((started) => {
              if (started) {
                setIsAutoplayBlocked(false);
              }
            });
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

      startDirectBgm();

      return () => {
        soundService.stopGlobalBGM();
      };
    }
  }, [eventConfig.bgmAudioUrl, eventConfig.bgmEnabled, ytVideoId]);

  const handleTogglePlay = async () => {
    soundService.playClick();
    if (isYouTubeModeRef.current && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(Math.round(volume * 100));
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setIsAutoplayBlocked(false);
        }
      } catch {}
    } else {
      if (isPlaying) {
        soundService.pauseBGM();
      } else {
        const ok = await soundService.resumeBGM();
        if (ok) {
          setIsAutoplayBlocked(false);
        }
      }
    }
  };

  const handleToggleMute = () => {
    soundService.playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isYouTubeModeRef.current && ytPlayerRef.current) {
      try {
        if (nextMuted) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(Math.round(volume * 100));
        }
      } catch {}
    } else {
      soundService.setMuted(nextMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);

    if (isYouTubeModeRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(Math.round(val * 100));
        if (isMuted && val > 0) {
          setIsMuted(false);
          ytPlayerRef.current.unMute();
        }
      } catch {}
    } else {
      soundService.setBgmVolume(val);
      if (isMuted && val > 0) {
        setIsMuted(false);
        soundService.setMuted(false);
      }
    }
  };

  const handlePromptClick = async () => {
    soundService.playClick();
    if (isYouTubeModeRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(Math.round(volume * 100));
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
      } catch {}
    } else {
      const ok = await soundService.resumeBGM();
      if (ok) {
        setIsAutoplayBlocked(false);
      }
    }
  };

  if (eventConfig.bgmEnabled === false) return null;

  return (
    <>
      {/* Hidden YouTube IFrame Container for Background Audio */}
      <div
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <div id="youtube-bgm-container" />
      </div>

      {/* Floating BGM Controller Widget */}
      <aside
        aria-label="Pemutar Musik Latar Belakang"
        className="fixed bottom-4 right-4 z-40 select-none print:hidden font-sans"
      >
        {/* Autoplay Policy Fallback Notification Pill */}
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
            title="Klik untuk memutar lagu tema Via Vallen - Meraih Bintang"
          >
            <Music className="w-4 h-4 animate-spin text-stone-950 shrink-0" style={{ animationDuration: '3s' }} />
            <span>Putar Musik: Via Vallen - Meraih Bintang</span>
            <Sparkles className="w-3.5 h-3.5 text-stone-950 shrink-0" />
          </div>
        )}

        {/* Floating Audio Controller Badge */}
        <div className="bg-stone-900/90 hover:bg-stone-900 backdrop-blur-md border border-stone-700/80 rounded-2xl shadow-2xl p-2.5 transition-all text-stone-200">
          <div className="flex items-center gap-2">
            {/* Main Play/Pause Button */}
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

            {/* Equalizer Animation and Track Information */}
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
              className="flex items-center gap-2.5 px-1.5 cursor-pointer max-w-[170px] sm:max-w-[220px]"
            >
              {/* 4 jumping equalizer bars */}
              <div className="flex items-end gap-0.5 h-4 w-4 shrink-0">
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
                  <span className="truncate">{trackTitle}</span>
                  {isPlaying && !isMuted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                  )}
                </div>
                <div className="text-[9px] text-stone-400 truncate flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-amber-400/80 shrink-0" />
                  <span className="truncate">
                    {isPlaying
                      ? isMuted
                        ? 'Senyap (Muted)'
                        : 'Lagu Tema Asian Games (Looping)'
                      : 'Dijeda'}
                  </span>
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

          {/* Expanded Controls: Volume Slider & Looping Info */}
          {isExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-stone-800 space-y-2 px-1">
              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-amber-400" />
                  Volume Musik BGM:
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

              <div className="flex items-center justify-between text-[9px] text-stone-400 pt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Sparkles className="w-3 h-3" />
                  Pemutaran Otomatis & Berulang (Looping)
                </span>
                <span className="text-stone-500 font-mono text-[8px]">
                  ID: qMIQC7_AkIg
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

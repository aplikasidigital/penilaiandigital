import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, AlertTriangle, Plus, Minus } from 'lucide-react';
import { soundService } from '../services/sound';

interface StopwatchTimerProps {
  initialSeconds: number;
  targetSeconds?: number;
  maxMinutes?: number;
  onTimeChange: (seconds: number) => void;
  label?: string;
}

export const StopwatchTimer: React.FC<StopwatchTimerProps> = ({
  initialSeconds,
  targetSeconds = 420,
  maxMinutes = 10,
  onTimeChange,
  label = 'Pencatat Waktu Stopwatch',
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Sync internal state when initialSeconds changes externally (e.g. switching participant)
  useEffect(() => {
    if (!isRunning) {
      setSeconds(initialSeconds);
    }
  }, [initialSeconds, isRunning]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          onTimeChange(next);
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, onTimeChange]);

  const toggleStartPause = () => {
    soundService.playClick();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    soundService.playClick();
    setIsRunning(false);
    setSeconds(0);
    onTimeChange(0);
  };

  const handleAdjust = (deltaSeconds: number) => {
    soundService.playClick();
    const next = Math.max(0, seconds + deltaSeconds);
    setSeconds(next);
    onTimeChange(next);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const maxSeconds = maxMinutes * 60;
  const isOverTarget = targetSeconds > 0 && seconds > targetSeconds;
  const isOverMax = maxSeconds > 0 && seconds > maxSeconds;

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
            {label}
          </h4>
        </div>
        {isOverMax && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Melebihi Batas Maksimal!
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-950 p-4 rounded-xl border border-stone-800/80">
        {/* Large Digital Clock Display */}
        <div className="flex items-baseline gap-2">
          <span
            className={`font-mono font-black text-4xl tracking-wider ${
              isOverMax
                ? 'text-red-400'
                : isOverTarget
                ? 'text-amber-400'
                : 'text-stone-100'
            }`}
          >
            {formatTime(seconds)}
          </span>
          <span className="text-xs text-stone-400">
            / Target: {formatTime(targetSeconds)}
          </span>
        </div>

        {/* Stopwatch Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleStartPause}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-stone-100'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Mulai Waktu</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors cursor-pointer"
            title="Reset Waktu ke 00:00"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Quick Time Adjusters */}
          <div className="flex items-center gap-1 border-l border-stone-800 pl-2">
            <button
              type="button"
              onClick={() => handleAdjust(-5)}
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 rounded-md font-mono cursor-pointer"
              title="Kurang 5 detik"
            >
              -5s
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(5)}
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 rounded-md font-mono cursor-pointer"
              title="Tambah 5 detik"
            >
              +5s
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

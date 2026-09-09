import React from 'react';
import { Play, Pause, RefreshCw, Music, Settings } from 'lucide-react';
import { RunnerStatus } from '../types';

interface HeaderProps {
  status: RunnerStatus | null;
  loading: boolean;
  onToggleRun: () => void;
  onForceCheck: () => void;
  onOpenConfig: () => void;
  onOpenSessionHelper?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  loading,
  onToggleRun,
  onForceCheck,
  onOpenConfig,
}) => {
  const isRunning = status?.isRunning ?? false;
  const hasTelegram = status?.hasTelegramCredentials;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-sm">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
                Telegram Bio Scrobbler
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-sky-950 text-sky-300 border border-sky-800">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Poller Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Active Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className={isRunning ? 'text-emerald-300' : 'text-amber-300'}>
              {isRunning ? 'POLLING ACTIVE' : 'POLLING PAUSED'}
            </span>
            <span className="text-slate-500 text-xs hidden sm:inline">
              ({status?.pollInterval ?? 30}s)
            </span>
          </div>

          {/* Toggle Pause/Resume */}
          <button
            id="btn-toggle-run"
            onClick={onToggleRun}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              isRunning
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Force Check Now */}
          <button
            id="btn-force-check"
            onClick={onForceCheck}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Check Now</span>
          </button>

          {/* Settings Button */}
          <button
            id="btn-open-settings"
            onClick={onOpenConfig}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 shadow-sm"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>Settings</span>
            {!hasTelegram && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Setup needed" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

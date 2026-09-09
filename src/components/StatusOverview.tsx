import React from 'react';
import {
  Music,
  Radio,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FastForward,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { RunnerStatus } from '../types';

interface StatusOverviewProps {
  status: RunnerStatus | null;
  onFastForward: (hours: number) => void;
  onResetState: () => void;
  onOpenSessionHelper?: () => void;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({
  status,
  onFastForward,
  onResetState,
  onOpenSessionHelper,
}) => {
  if (!status) return null;

  const bioLength = status.currentBio.length;
  const isOverLimit = bioLength > status.bioMaxLen;
  const isPlaying = status.lastSong.startsWith('🎶 Playing:');

  // Format countdown
  const hoursLeft = Math.floor(status.gracePeriodRemainingSeconds / 3600);
  const minutesLeft = Math.floor((status.gracePeriodRemainingSeconds % 3600) / 60);
  const secondsLeft = Math.floor(status.gracePeriodRemainingSeconds % 60);

  return (
    <div className="space-y-4">
      {/* Telegram Session & Credentials Alert Banner */}
      {!status.hasTelegramCredentials && onOpenSessionHelper && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-100">
                Telegram Credentials Required for Live MTProto Updates
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Generate your <code className="text-sky-300">SESSION_STRING</code> and configure{' '}
                <code className="text-sky-300">API_ID</code> &amp;{' '}
                <code className="text-sky-300">API_HASH</code> to connect your real Telegram account.
              </p>
            </div>
          </div>
          <button
            id="btn-banner-session-helper"
            onClick={onOpenSessionHelper}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-sky-950"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Credentials / Session</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Card 1: Currently Track / Last.fm Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              {isPlaying ? (
                <Music className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-sky-400" />
              )}
              {isPlaying ? 'Now Playing' : 'Last Scrobble'}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Last.fm
            </span>
          </div>

          <div className="mt-1">
            <h3 className="text-base font-semibold text-slate-100 line-clamp-2">
              {status.lastSong ? status.lastSong : 'No track recorded yet'}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              User: <span className="font-mono text-slate-200">{status.username}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Local Cache</span>
          <span className="font-mono text-slate-300">
            {status.lastSong ? 'Cached in bot_state.json' : 'Empty'}
          </span>
        </div>
      </div>

      {/* Card 2: Telegram Bio Preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Telegram Bio Preview
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                isOverLimit
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {bioLength}/{status.bioMaxLen} chars
            </span>
          </div>

          {/* Telegram Bio Box */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm font-sans text-slate-200 min-h-[58px] flex items-center break-words">
            <span>{status.currentBio || <em className="text-slate-500">Bio is empty</em>}</span>
          </div>

          {/* Marker Status Indicator */}
          <div className="mt-3 flex items-center gap-2">
            {status.isBotManaged ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Bot Managed (Marker \u200b present)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-800/50">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                Manual Edit (Marker absent)
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Zero-Width Protection</span>
          <span className="font-mono text-emerald-400">Active</span>
        </div>
      </div>

      {/* Card 3: 24h Manual Override Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              24-Hour Override
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                status.inGracePeriod
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {status.inGracePeriod ? 'GRACE PERIOD' : 'BOT AUTONOMOUS'}
            </span>
          </div>

          {status.inGracePeriod ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold text-amber-300">
                  {String(hoursLeft).padStart(2, '0')}:{String(minutesLeft).padStart(2, '0')}:
                  {String(secondsLeft).padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400">remaining</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Manual bio detected. Bot will not overwrite until the 24-hour grace timer expires.
              </p>
              <div className="mt-3">
                <button
                  id="btn-fast-forward-24h"
                  onClick={() => onFastForward(25)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Fast-Forward 24 Hours
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium">Automatic updates enabled</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                If you manually change your Telegram bio without the bot's invisible marker, the
                bot activates a 24-hour grace period before resuming.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>State Reset</span>
          <button
            id="btn-reset-state"
            onClick={onResetState}
            className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset State
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

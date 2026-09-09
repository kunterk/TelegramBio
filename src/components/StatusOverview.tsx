import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ExternalLink,
  X,
} from 'lucide-react';
import { RunnerStatus } from '../types';

interface StatusOverviewProps {
  status: RunnerStatus | null;
  onFastForward: (hours: number) => void;
  onResetState: () => void;
  onOpenSessionHelper?: () => void;
  onSetOverride: (type: 'temporary' | 'permanent' | 'none') => void;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({
  status,
  onFastForward,
  onResetState,
  onOpenSessionHelper,
  onSetOverride,
}) => {
  if (!status) return null;

  const [showTooltip, setShowTooltip] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('setupBannerDismissed') === 'true';
  });

  const dismissBanner = () => {
    setIsDismissed(true);
    localStorage.setItem('setupBannerDismissed', 'true');
  };

  const bioLength = status.currentBio.length;
  const isOverLimit = bioLength > status.bioMaxLen;
  const isPlaying = status.lastSong.startsWith('🎶 Playing:');

  // Format countdown
  const hoursLeft = Math.floor(status.gracePeriodRemainingSeconds / 3600);
  const minutesLeft = Math.floor((status.gracePeriodRemainingSeconds % 3600) / 60);
  const secondsLeft = Math.floor(status.gracePeriodRemainingSeconds % 60);

  // Smart Helper Configuration Logic (identical to Settings Assistant)
  const hasLegitField =
    (status.username && status.username !== 'Demo User') ||
    status.hasApiKey ||
    status.apiIdConfigured ||
    status.apiHashConfigured ||
    status.sessionStringConfigured;

  const dynamicButtonText = hasLegitField ? 'Help me with the rest 🥹' : 'Generate All 🫣';

  const getSetupStatus = () => {
    if (!status.username || status.username === 'Demo User') {
      return {
        stage: 'lastfm-user',
        actionLabel: 'Open Last.fm Registration Page',
        actionUrl: 'https://www.last.fm/join',
        isUrl: true,
      };
    }
    if (!status.hasApiKey) {
      return {
        stage: 'lastfm-key',
        actionLabel: 'Open Last.fm Create API Page',
        actionUrl: 'https://www.last.fm/api/account/create',
        isUrl: true,
      };
    }
    if (!status.apiIdConfigured || !status.apiHashConfigured) {
      return {
        stage: 'telegram-creds',
        actionLabel: 'Open my.telegram.org/apps',
        actionUrl: 'https://my.telegram.org/apps',
        isUrl: true,
      };
    }
    return {
      stage: 'telegram-session',
      actionLabel: 'Launch Session Generator',
      isUrl: false,
    };
  };

  const setupGuide = getSetupStatus();

  const handleSmartHelperClick = () => {
    if (setupGuide.isUrl && setupGuide.actionUrl) {
      window.open(setupGuide.actionUrl, '_blank', 'noopener,noreferrer');
    } else {
      if (onOpenSessionHelper) {
        onOpenSessionHelper();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Setup Progress & Live Connection Assistant (Floating Flyout Toast) */}
      <AnimatePresence>
        {!isDismissed && !status.hasTelegramCredentials && onOpenSessionHelper && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-20 right-6 z-[9999] w-full max-w-[340px] p-4 rounded-xl border border-sky-500/30 bg-slate-900/95 backdrop-blur shadow-2xl shadow-slate-950/80 text-xs flex gap-3.5 items-start justify-between"
          >
            <div className="flex gap-2.5 items-start">
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  Sandbox Active
                  <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/40 animate-pulse">
                    Demo
                  </span>
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Real-time scrobbler is paused. Connect your accounts to start syncing.
                </p>
                <div className="pt-1">
                  <button
                    id="btn-banner-session-helper"
                    onClick={handleSmartHelperClick}
                    className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] tracking-wide uppercase transition-colors cursor-pointer"
                  >
                    Quick Setup
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={dismissBanner}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 -mr-1 -mt-1 cursor-pointer rounded hover:bg-slate-800"
              title="Dismiss helper"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

      {/* Card 3: 24h Manual Override Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
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
            className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
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

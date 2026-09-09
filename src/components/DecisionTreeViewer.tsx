import React from 'react';
import { GitFork, Check, ArrowRight, Zap, Shield, FileText } from 'lucide-react';
import { RunnerStatus } from '../types';

interface DecisionTreeViewerProps {
  status: RunnerStatus | null;
}

export const DecisionTreeViewer: React.FC<DecisionTreeViewerProps> = ({ status }) => {
  if (!status) return null;

  const isSongSame = Boolean(status.lastSong && status.manualTimestamp === 0);
  const isBioManaged = status.isBotManaged || status.currentBio === '';
  const inGrace = status.inGracePeriod;

  // Active branch evaluation
  const branch1Active = isSongSame && !inGrace;
  const branch2Active = !branch1Active && isBioManaged;
  const branch3Active = !branch1Active && !isBioManaged;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Hybrid Failsafe Decision Tree
          </h2>
        </div>
        <span className="text-xs text-slate-400">Live Decision Route</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        {/* Step 1: Song Cache Check */}
        <div
          className={`p-3.5 rounded-lg border transition-all ${
            branch1Active
              ? 'bg-sky-950/60 border-sky-500/50 text-sky-200 ring-1 ring-sky-500/30'
              : 'bg-slate-950/50 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              1. Local Cache Check
            </span>
            {branch1Active && (
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-sans font-medium text-[10px]">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed mb-2 font-sans text-slate-300">
            Song unchanged &amp; no manual bio?
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            <ArrowRight className="w-3 h-3 text-sky-400" />
            <span className={branch1Active ? 'text-sky-300 font-bold' : 'text-slate-400'}>
              Skip Telegram API call (Rate-limit safe)
            </span>
          </div>
        </div>

        {/* Step 2: Marker / Empty Bio Check */}
        <div
          className={`p-3.5 rounded-lg border transition-all ${
            branch2Active
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/30'
              : 'bg-slate-950/50 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              2. Marker Inspection
            </span>
            {branch2Active && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans font-medium text-[10px]">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed mb-2 font-sans text-slate-300">
            Bio is empty OR has invisible marker?
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            <ArrowRight className="w-3 h-3 text-emerald-400" />
            <span className={branch2Active ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
              Update bio &amp; attach \u200b marker
            </span>
          </div>
        </div>

        {/* Step 3: Manual Edit 24h Countdown */}
        <div
          className={`p-3.5 rounded-lg border transition-all ${
            branch3Active
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-200 ring-1 ring-amber-500/30'
              : 'bg-slate-950/50 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              3. Manual Override Check
            </span>
            {branch3Active && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-sans font-medium text-[10px]">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed mb-2 font-sans text-slate-300">
            Manual edit detected without marker?
          </p>
          <div className="flex items-center gap-1 text-[11px]">
            <ArrowRight className="w-3 h-3 text-amber-400" />
            <span className={branch3Active ? 'text-amber-300 font-bold' : 'text-slate-400'}>
              {status.gracePeriodRemainingSeconds > 0
                ? 'Respect manual bio (24h grace active)'
                : '24h expired: Bot resumes takeover'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

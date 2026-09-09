import React, { useState } from 'react';
import {
  X,
  Settings,
  ExternalLink,
  Check,
  AlertCircle,
  Clock,
  Text,
  Sparkles,
  Wifi,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RunnerStatus } from '../types';

export interface ConfigDraft {
  username: string;
  apiKey: string;
  apiId: string;
  apiHash: string;
  sessionString: string;
  pollInterval: number;
  bioMaxLen: number;
}

export interface ConfigModalProps {
  isOpen: boolean;
  status: RunnerStatus | null;
  onClose: () => void;
  onOpenSessionHelper?: () => void;
  onSaveConfig: (config: {
    newPollInterval: number;
    newBioMaxLen: number;
    newUsername: string;
    newApiKey: string;
    newApiId?: string;
    newApiHash?: string;
    newSessionString?: string;
  }) => void;
  draft: ConfigDraft;
  onDraftChange: React.Dispatch<React.SetStateAction<ConfigDraft>>;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  status,
  onClose,
  onOpenSessionHelper,
  onSaveConfig,
  draft,
  onDraftChange,
}) => {
  const {
    pollInterval,
    bioMaxLen,
    username,
    apiKey,
    apiId,
    apiHash,
    sessionString,
  } = draft;

  const setUsername = (val: string) => onDraftChange((prev) => ({ ...prev, username: val }));
  const setApiKey = (val: string) => onDraftChange((prev) => ({ ...prev, apiKey: val }));
  const setApiId = (val: string) => onDraftChange((prev) => ({ ...prev, apiId: val }));
  const setApiHash = (val: string) => onDraftChange((prev) => ({ ...prev, apiHash: val }));
  const setSessionString = (val: string) => onDraftChange((prev) => ({ ...prev, sessionString: val }));
  const setPollInterval = (val: number) => onDraftChange((prev) => ({ ...prev, pollInterval: val }));
  const setBioMaxLen = (val: number) => onDraftChange((prev) => ({ ...prev, bioMaxLen: val }));

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Test Connection States & Verification (Start with red color, change to green when verified)
  const [lastfmTesting, setLastfmTesting] = useState(false);
  const [lastfmVerified, setLastfmVerified] = useState(false);
  const [lastfmTestResult, setLastfmTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramVerified, setTelegramVerified] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [runnerTesting, setRunnerTesting] = useState(false);
  const [runnerVerified, setRunnerVerified] = useState(false);
  const [runnerTestResult, setRunnerTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Logic format checkers (for all except username)
  const isApiKeyFormatValid = (val: string) => /^[a-fA-F0-9]{32}$/.test(val.trim());
  const isApiIdFormatValid = (val: string) => /^\d{4,11}$/.test(val.trim());
  const isApiHashFormatValid = (val: string) => /^[a-fA-F0-9]{32}$/.test(val.trim());
  const isSessionStringFormatValid = (val: string) => /^[A-Za-z0-9+/=_-]{50,}$/.test(val.trim());
  const isUsernameLegit = (val: string) => /^[a-zA-Z0-9_-]{2,30}$/.test(val.trim());

  // Dynamic Generator Button Text logic:
  // Stays "Generate All 🫣" while typing inside either box,
  // UNTIL text "seems legit" (passes format verification), only then changes to "Help me with the rest 🥹"
  const hasLegitField =
    isApiKeyFormatValid(apiKey) ||
    isApiIdFormatValid(apiId) ||
    isApiHashFormatValid(apiHash) ||
    isSessionStringFormatValid(sessionString) ||
    isUsernameLegit(username);

  const dynamicButtonText = hasLegitField ? 'Help me with the rest 🥹' : 'Generate All 🫣';

  // Multi-Section Setup Assistant Engine: Helps with BOTH Last.fm and Telegram
  const getSetupStatus = () => {
    if (!username.trim() || !isUsernameLegit(username)) {
      return {
        stage: 'lastfm-user',
        title: 'Register Last.fm Account',
        subtitle: 'No Last.fm username found. Click to open Last.fm registration page',
        actionLabel: 'Open Last.fm Registration Page',
        actionUrl: 'https://www.last.fm/join',
        isUrl: true,
        badge: 'Step 1: Last.fm User',
      };
    }
    if (!apiKey.trim() || !isApiKeyFormatValid(apiKey)) {
      return {
        stage: 'lastfm-key',
        title: 'Create Last.fm API Key',
        subtitle: 'Last.fm API Key is missing. Click to open API Key creation page',
        actionLabel: 'Open Last.fm Create API Page',
        actionUrl: 'https://www.last.fm/api/account/create',
        isUrl: true,
        badge: 'Step 2: Last.fm API Key',
      };
    }
    if (!apiId.trim() || !isApiIdFormatValid(apiId) || !apiHash.trim() || !isApiHashFormatValid(apiHash)) {
      return {
        stage: 'telegram-creds',
        title: 'Get Telegram API_ID & HASH',
        subtitle: 'Telegram MTProto credentials missing. Click to open my.telegram.org/apps',
        actionLabel: 'Open my.telegram.org/apps',
        actionUrl: 'https://my.telegram.org/apps',
        isUrl: true,
        badge: 'Step 3: Telegram API',
      };
    }
    if (!sessionString.trim() || !isSessionStringFormatValid(sessionString)) {
      return {
        stage: 'telegram-session',
        title: 'Generate Telegram Session String',
        subtitle: 'Credentials ready! Click to launch the Web Session Generator',
        actionLabel: 'Launch Session Generator',
        isUrl: false,
        badge: 'Step 4: Session String',
      };
    }
    return {
      stage: 'all-set',
      title: 'All Credentials Completed & Valid',
      subtitle: 'All fields seem legit 🫡! Test connections & save configuration',
      actionLabel: 'Verify & Test Connections',
      isUrl: false,
      badge: 'All Credentials Ready 🚀',
    };
  };

  const setupGuide = getSetupStatus();

  const handleSmartHelperClick = () => {
    if (setupGuide.isUrl && setupGuide.actionUrl) {
      window.open(setupGuide.actionUrl, '_blank', 'noopener,noreferrer');
    } else if (setupGuide.stage === 'telegram-session') {
      handleGeneratorClick();
    } else if (setupGuide.stage === 'all-set') {
      handleTestLastfm();
      handleTestTelegram();
    }
  };

  if (!isOpen) return null;

  const handleTestLastfm = async () => {
    setLastfmTesting(true);
    setLastfmTestResult(null);
    try {
      const resp = await fetch('/api/test-lastfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          apiKey: apiKey.trim(),
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setLastfmVerified(true);
        setLastfmTestResult({
          success: true,
          message: data.message || 'Connected to Last.fm successfully!',
        });
      } else {
        setLastfmVerified(false);
        setLastfmTestResult({
          success: false,
          message: data.error || 'Failed to connect to Last.fm.',
        });
      }
    } catch (err: any) {
      setLastfmVerified(false);
      setLastfmTestResult({
        success: false,
        message: err?.message || 'Network error testing Last.fm connection.',
      });
    } finally {
      setLastfmTesting(false);
    }
  };

  const handleTestTelegram = async () => {
    setTelegramTesting(true);
    setTelegramTestResult(null);
    try {
      const resp = await fetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputApiId: apiId.trim(),
          inputApiHash: apiHash.trim(),
          inputSessionString: sessionString.trim(),
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setTelegramVerified(true);
        setTelegramTestResult({
          success: true,
          message: data.message || 'Telegram MTProto connection verified!',
        });
      } else {
        setTelegramVerified(false);
        setTelegramTestResult({
          success: false,
          message: data.error || 'Failed to connect to Telegram MTProto.',
        });
      }
    } catch (err: any) {
      setTelegramVerified(false);
      setTelegramTestResult({
        success: false,
        message: err?.message || 'Network error testing Telegram connection.',
      });
    } finally {
      setTelegramTesting(false);
    }
  };

  const handleTestRunner = async () => {
    setRunnerTesting(true);
    setRunnerTestResult(null);
    try {
      const resp = await fetch('/api/bot/check', { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        setRunnerVerified(true);
        setRunnerTestResult({
          success: true,
          message: `Scrobbler runner connection active! Verified loop at ${pollInterval}s interval, max length ${bioMaxLen} chars.`,
        });
      } else {
        setRunnerVerified(false);
        setRunnerTestResult({
          success: false,
          message: data.error || 'Scrobbler runner did not respond.',
        });
      }
    } catch (err: any) {
      setRunnerVerified(false);
      setRunnerTestResult({
        success: false,
        message: err?.message || 'Error communicating with background runner.',
      });
    } finally {
      setRunnerTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      newPollInterval: Number(pollInterval),
      newBioMaxLen: Number(bioMaxLen),
      newUsername: username,
      newApiKey: apiKey,
      newApiId: apiId || undefined,
      newApiHash: apiHash || undefined,
      newSessionString: sessionString || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleGeneratorClick = () => {
    if (onOpenSessionHelper) {
      onOpenSessionHelper();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-6 overflow-y-auto">
      <div
        className={`relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 my-auto flex flex-col transition-all duration-200 ${
          isMaximized
            ? 'max-w-5xl h-[98vh] p-4 sm:p-7'
            : 'max-w-xl max-h-[94vh] h-[92vh] sm:h-auto p-4 sm:p-6'
        }`}
      >
        {/* 1. Header: Title "Settings" with settings icon, resize button, and close */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">Settings</h3>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Maximize / Resize Toggle */}
            <button
              id="btn-resize-config"
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore standard size' : 'Expand / Maximize view'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{isMaximized ? 'Restore' : 'Expand'}</span>
            </button>
            <button
              id="btn-close-config"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-1 pb-44 text-xs flex-1">
          {/* 2. General section */}

          {/* 2.1 Last.fm Section */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-slate-300 font-semibold tracking-wide uppercase text-[11px]">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  lastfmVerified
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                }`}
              />
              <span>Last.fm Credentials</span>
            </div>

            {/* Input: Last.fm Username */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-cfg-username" className="font-medium text-slate-300 block">
                  Last.fm Username
                </label>
                <div className="flex items-center gap-2">
                  {username.trim() ? (
                    <span className="text-[10px] font-mono flex items-center gap-1">
                      {isUsernameLegit(username) && (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Seems legit 🫡
                        </span>
                      )}
                    </span>
                  ) : (
                    <a
                      id="link-register-lastfm"
                      href="https://www.last.fm/join"
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-400 hover:text-rose-300 text-[11px] hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                      title="Open Last.fm registration page"
                    >
                      Register Account <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <input
                id="input-cfg-username"
                type="text"
                placeholder="Last.fm ID / Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono text-xs transition-colors"
              />
            </div>

            {/* Input: Last.fm API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="input-cfg-apikey" className="font-medium text-slate-300">
                    Last.fm API Key
                  </label>
                  {apiKey.trim() && (
                    <span className="text-[10px] font-mono flex items-center gap-1">
                      {isApiKeyFormatValid(apiKey) ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Seems legit 🫡
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> 32 hex chars required ({apiKey.trim().length}/32)
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {/* Button to check API Applications */}
                  <a
                    id="btn-check-api-accounts-link"
                    href="https://www.last.fm/api/accounts"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-slate-200 text-[11px] hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                    title="Check existing API Applications on Last.fm"
                  >
                    API Applications <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    id="link-create-lastfm-api"
                    href="https://www.last.fm/api/account/create"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:text-sky-300 text-[11px] hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                    title="Create new API account"
                  >
                    Get API Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <input
                id="input-cfg-apikey"
                type="text"
                placeholder="Enter 32-character Last.fm API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-950/80 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs transition-colors ${
                  apiKey.trim()
                    ? isApiKeyFormatValid(apiKey)
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-amber-500/50 focus:border-amber-500'
                    : 'border-slate-800 focus:border-sky-500'
                }`}
              />
            </div>

            {/* Bottom of Last.fm Section: Test Connection */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Verify Last.fm Connection
                </span>
                <button
                  id="btn-test-lastfm"
                  type="button"
                  onClick={handleTestLastfm}
                  disabled={lastfmTesting}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {lastfmTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Wifi
                        className={`w-3.5 h-3.5 transition-colors duration-300 ${
                          lastfmVerified ? 'text-emerald-400' : 'text-rose-500'
                        }`}
                      />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {/* Last.fm Test Connection Feedback */}
              {lastfmTestResult && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 border transition-all ${
                    lastfmTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {lastfmTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-tight">{lastfmTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2.2 Telegram Credentials Section (NEW) */}
          <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-300 font-semibold tracking-wide uppercase text-[11px]">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  telegramVerified
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                }`}
              />
              <span>Telegram Credentials</span>
            </div>

            {/* a. Telegram API ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="input-cfg-apiid" className="font-medium text-slate-300">
                    Telegram API ID
                  </label>
                  {apiId.trim() && (
                    <span className="text-[10px] font-mono flex items-center gap-1">
                      {isApiIdFormatValid(apiId) ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Seems legit 🫡
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> Digits only (e.g. 12345678)
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <a
                  href="https://my.telegram.org/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 text-[11px] hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                id="input-cfg-apiid"
                type="text"
                placeholder="Enter Telegram App API ID"
                value={apiId}
                onFocus={(e) => handleFocusField('apiId', 'Telegram API ID', apiId, isApiIdFormatValid(apiId), e)}
                onChange={(e) => {
                  setApiId(e.target.value);
                  if (activeTyping?.field === 'apiId') {
                    setActiveTyping((prev) => prev ? { ...prev, value: e.target.value, legit: isApiIdFormatValid(e.target.value) } : null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-950/80 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs transition-colors ${
                  apiId.trim()
                    ? isApiIdFormatValid(apiId)
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-amber-500/50 focus:border-amber-500'
                    : 'border-slate-800 focus:border-sky-500'
                }`}
              />
            </div>

            {/* b. API Hash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="input-cfg-apihash" className="font-medium text-slate-300">
                  API Hash
                </label>
                {apiHash.trim() && (
                  <span className="text-[10px] font-mono flex items-center gap-1">
                    {isApiHashFormatValid(apiHash) ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Seems legit 🫡
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> 32 hex chars required ({apiHash.trim().length}/32)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <input
                id="input-cfg-apihash"
                type="text"
                placeholder="Enter Telegram App API Hash (32 characters)"
                value={apiHash}
                onFocus={(e) => handleFocusField('apiHash', 'Telegram API Hash', apiHash, isApiHashFormatValid(apiHash), e)}
                onChange={(e) => {
                  setApiHash(e.target.value);
                  if (activeTyping?.field === 'apiHash') {
                    setActiveTyping((prev) => prev ? { ...prev, value: e.target.value, legit: isApiHashFormatValid(e.target.value) } : null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-950/80 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs transition-colors ${
                  apiHash.trim()
                    ? isApiHashFormatValid(apiHash)
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-amber-500/50 focus:border-amber-500'
                    : 'border-slate-800 focus:border-sky-500'
                }`}
              />
            </div>

            {/* c. Telegram Session String */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="input-cfg-session" className="font-medium text-slate-300">
                    Telegram Session String
                  </label>
                  {sessionString.trim() && (
                    <span className="text-[10px] font-mono flex items-center gap-1">
                      {isSessionStringFormatValid(sessionString) ? (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Seems legit 🫡
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> Min 50 characters required ({sessionString.trim().length})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {onOpenSessionHelper && (
                  <button
                    type="button"
                    onClick={handleGeneratorClick}
                    className="text-sky-400 hover:text-sky-300 text-[11px] hover:underline inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    Get Session String <Sparkles className="w-3 h-3" />
                  </button>
                )}
              </div>
              <textarea
                id="input-cfg-session"
                rows={2}
                placeholder="Paste Pyrogram / Telethon string session here"
                value={sessionString}
                onFocus={(e) => handleFocusField('sessionString', 'Telegram Session String', sessionString, isSessionStringFormatValid(sessionString), e)}
                onChange={(e) => {
                  setSessionString(e.target.value);
                  if (activeTyping?.field === 'sessionString') {
                    setActiveTyping((prev) => prev ? { ...prev, value: e.target.value, legit: isSessionStringFormatValid(e.target.value) } : null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-950/80 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs transition-colors resize-none ${
                  sessionString.trim()
                    ? isSessionStringFormatValid(sessionString)
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-amber-500/50 focus:border-amber-500'
                    : 'border-slate-800 focus:border-sky-500'
                }`}
              />
            </div>

            {/* Bottom of Telegram Section: Test Connection (Generator button moved outside) */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Verify Telegram MTProto authorization &amp; session key
                </span>
                <button
                  id="btn-test-telegram"
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={telegramTesting}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {telegramTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Wifi
                        className={`w-3.5 h-3.5 transition-colors duration-300 ${
                          telegramVerified ? 'text-emerald-400' : 'text-rose-500'
                        }`}
                      />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {/* Telegram Test Connection Feedback */}
              {telegramTestResult && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 border transition-all ${
                    telegramTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {telegramTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-tight">{telegramTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Global Setup Assistant / Generator Button (MOVED OUTSIDE TELEGRAM SECTION) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-sky-950/40 via-slate-900 to-indigo-950/30 border border-sky-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Credentials Setup Assistant</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-sky-900/60 border border-sky-400/30 text-[10px] font-mono text-sky-200">
                {setupGuide.badge}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {setupGuide.subtitle}
            </p>

            {/* Main Interactive Helper Button: Helps with BOTH sections */}
            <button
              id="btn-dynamic-generator"
              type="button"
              onClick={handleSmartHelperClick}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 hover:from-sky-500 hover:via-indigo-500 hover:to-sky-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 border border-sky-400/25 transition-all duration-300 hover:scale-[1.008] active:scale-[0.99] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-200 shrink-0" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={dynamicButtonText + setupGuide.stage}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="font-medium truncate"
                >
                  {dynamicButtonText} &mdash; {setupGuide.actionLabel}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Quick helper portal links for both Last.fm and Telegram */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
              <a
                href="https://www.last.fm/join"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
              >
                Last.fm Register <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span className="text-slate-700">&bull;</span>
              <a
                href="https://www.last.fm/api/account/create"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
              >
                Create API Key <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span className="text-slate-700">&bull;</span>
              <a
                href="https://www.last.fm/api/accounts"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
              >
                API Applications <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span className="text-slate-700">&bull;</span>
              <a
                href="https://my.telegram.org/apps"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
              >
                Telegram Apps <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* 4. General Settings Section */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold tracking-wide uppercase text-[11px]">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  runnerVerified
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                }`}
              />
              <span>General Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="input-cfg-poll" className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Poll Interval (seconds)
                </label>
                <input
                  id="input-cfg-poll"
                  type="number"
                  min={5}
                  max={300}
                  value={pollInterval}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-xs transition-colors"
                />
                <span className="text-[11px] text-slate-500 block">Default 30s (Min 5s, Max 300s)</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-cfg-maxlen" className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Text className="w-3.5 h-3.5 text-emerald-400" />
                  Bio Max Length
                </label>
                <input
                  id="input-cfg-maxlen"
                  type="number"
                  min={20}
                  max={140}
                  value={bioMaxLen}
                  onChange={(e) => setBioMaxLen(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-xs transition-colors"
                />
                <span className="text-[11px] text-slate-500 block">Telegram max 140 chars</span>
              </div>
            </div>

            {/* Bottom of General Settings: Test Connection */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  Verify background scrobbler runner loop responsiveness
                </span>
                <button
                  id="btn-test-runner"
                  type="button"
                  onClick={handleTestRunner}
                  disabled={runnerTesting}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {runnerTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Wifi
                        className={`w-3.5 h-3.5 transition-colors duration-300 ${
                          runnerVerified ? 'text-emerald-400' : 'text-rose-500'
                        }`}
                      />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {/* General Settings Runner Feedback */}
              {runnerTestResult && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 border transition-all ${
                    runnerTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {runnerTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-tight">{runnerTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* 6. Footer: Cancel and Save Settings buttons aligned bottom right */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80 shrink-0">
            <button
              id="btn-cancel-config"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-config"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-sky-950/50 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  HelpCircle,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { RunnerStatus, TelegramGeneratedScripts } from '../types';

interface TelegramSessionHelperModalProps {
  isOpen: boolean;
  status: RunnerStatus | null;
  initialApiId?: string;
  initialApiHash?: string;
  initialSessionString?: string;
  openedFromConfig?: boolean;
  onClose: () => void;
  onApplyCredentials: (apiId: string, apiHash: string, sessionString: string) => Promise<void>;
  onSessionGenerated?: (sessionString: string, apiId?: string, apiHash?: string) => void;
}

export const TelegramSessionHelperModal: React.FC<TelegramSessionHelperModalProps> = ({
  isOpen,
  status,
  initialApiId,
  initialApiHash,
  initialSessionString,
  openedFromConfig,
  onClose,
  onApplyCredentials,
  onSessionGenerated,
}) => {
  // Active tab: 'web-login' | 'guide'
  const [activeTab, setActiveTab] = useState<'web-login' | 'guide'>('web-login');

  // Input states
  const [apiId, setApiId] = useState(initialApiId || '');
  const [apiHash, setApiHash] = useState(initialApiHash || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [manualSessionInput, setManualSessionInput] = useState(initialSessionString || '');

  // UI view size
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync initial props whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialApiId !== undefined && initialApiId !== '') {
        setApiId(initialApiId);
      }
      if (initialApiHash !== undefined && initialApiHash !== '') {
        setApiHash(initialApiHash);
      }
      if (initialSessionString !== undefined && initialSessionString !== '') {
        setManualSessionInput(initialSessionString);
      }
    }
  }, [isOpen, initialApiId, initialApiHash, initialSessionString]);

  // Flow states for direct web MTProto login
  const [loginStep, setLoginStep] = useState<'input' | 'code' | 'success'>('input');
  const [loginSessionId, setLoginSessionId] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [generatedSession, setGeneratedSession] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<{ id: string; username?: string; firstName?: string } | null>(null);

  // Copy tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  // Step 1: Send Telegram verification code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetApiId: apiId,
          targetApiHash: apiHash,
          phoneNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setLoginSessionId(data.loginSessionId);
      setLoginStep('code');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code & generate session
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginSessionId,
          phoneCode,
          password: password2FA || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      if (data.requires2FA) {
        setRequires2FA(true);
        setErrorMsg(data.message || 'Please enter your 2-Step Verification password.');
        return;
      }

      setGeneratedSession(data.sessionString);
      setTelegramUser(data.user);
      setLoginStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Apply to Bot
  const handleApply = async (sessionToApply?: string) => {
    const finalSession = sessionToApply || generatedSession || manualSessionInput;
    if (!finalSession) return;

    setLoading(true);
    try {
      if (onSessionGenerated) {
        onSessionGenerated(finalSession, apiId, apiHash);
      }
      await onApplyCredentials(apiId, apiHash, finalSession);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isApiIdValid = Boolean(apiId && /^\d{5,12}$/.test(apiId.trim()));
  const isApiHashValid = Boolean(apiHash && /^[a-fA-F0-9]{32}$/.test(apiHash.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-6 overflow-y-auto">
      <div
        className={`relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col my-auto transition-all duration-200 ${
          isMaximized
            ? 'max-w-6xl h-[98vh] p-3.5 sm:p-6 space-y-3 sm:space-y-4'
            : 'max-w-3xl max-h-[94vh] h-[92vh] sm:h-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4'
        }`}
      >
        {/* Header with Maximize / Resize toggle */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            {openedFromConfig && (
              <button
                id="btn-back-to-settings-top"
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer mr-1 shrink-0"
              >
                &larr; <span className="hidden sm:inline">Back to Settings</span><span className="sm:hidden">Back</span>
              </button>
            )}
            <h3 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
              Telegram Session Generator
            </h3>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Maximize / Resize Toggle */}
            <button
              id="btn-resize-session-modal"
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore standard size' : 'Expand / Maximize view'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{isMaximized ? 'Restore' : 'Expand'}</span>
            </button>
            <button
              id="btn-close-session-helper"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 text-xs sm:text-sm font-medium gap-1 sm:gap-2 overflow-x-auto whitespace-nowrap shrink-0">
          <button
            id="tab-web-login"
            onClick={() => setActiveTab('web-login')}
            className={`pb-2.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors ${
              activeTab === 'web-login'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Direct Web Generator</span>
          </button>
          <button
            id="tab-guide"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>How to Get API_ID / HASH</span>
          </button>
        </div>

        {/* Tab 1: Direct Web Session Generator */}
        {activeTab === 'web-login' && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-52">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {loginStep === 'input' && (
              <form onSubmit={handleSendCode} className="space-y-4 sm:space-y-5 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-slate-300">API_ID</label>
                      {apiId && (
                        <span
                          className={`text-[10px] sm:text-xs font-mono ${
                            isApiIdValid ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isApiIdValid ? '✓ Seems legit 🫡' : 'Numeric only (5-10 digits)'}
                        </span>
                      )}
                    </div>
                    <input
                      id="input-login-api-id"
                      type="text"
                      placeholder="e.g. 24819284"
                      value={apiId}
                      onChange={(e) => setApiId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-slate-300">API_HASH</label>
                      {apiHash && (
                        <span
                          className={`text-[10px] sm:text-xs font-mono ${
                            isApiHashValid ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isApiHashValid ? '✓ Seems legit 🫡' : '32-char hex string'}
                        </span>
                      )}
                    </div>
                    <input
                      id="input-login-api-hash"
                      type="text"
                      placeholder="e.g. d71c8430a91176b6..."
                      value={apiHash}
                      onChange={(e) => setApiHash(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-slate-300 flex items-center justify-between">
                    <span>Phone Number (with Country Code)</span>
                    <span className="text-slate-500 text-xs font-normal">e.g. +60123456789 or +14155552671</span>
                  </label>
                  <input
                    id="input-login-phone"
                    type="tel"
                    placeholder="+60123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono text-xs sm:text-sm"
                  />
                </div>

                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">
                    Telegram will send an official login code to your Telegram app.
                  </span>
                  <button
                    id="btn-send-code"
                    type="submit"
                    disabled={loading || !apiId || !apiHash || !phoneNumber}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-md shadow-sky-950/50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting MTProto...
                      </>
                    ) : (
                      <>
                        Send Verification Code
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {loginStep === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-5 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-300">
                  <p className="font-medium text-sm text-sky-200">Verification code sent!</p>
                  <p className="text-xs text-sky-300/80 mt-1">
                    Check your official Telegram app on your phone or desktop for the login code sent to{' '}
                    <strong className="font-mono text-white">{phoneNumber}</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-medium text-slate-300">Telegram Login Code</label>
                  <input
                    id="input-login-code"
                    type="text"
                    placeholder="Enter 5-digit code"
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-lg font-mono tracking-widest text-center focus:outline-none focus:border-sky-500"
                  />
                </div>

                {requires2FA && (
                  <div className="space-y-2">
                    <label className="font-medium text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      Two-Step Verification Password (2FA)
                    </label>
                    <input
                      id="input-login-2fa"
                      type="password"
                      placeholder="Enter your Telegram 2FA cloud password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-800/80 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-xs sm:text-sm"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setLoginStep('input')}
                    className="text-slate-400 hover:text-slate-200 text-xs sm:text-sm"
                  >
                    &larr; Back to phone number
                  </button>
                  <button
                    id="btn-verify-login"
                    type="submit"
                    disabled={loading || !phoneCode}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-md shadow-emerald-950/50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Verify &amp; Generate Session
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {loginStep === 'success' && generatedSession && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Session String Generated Successfully!
                  </div>
                  {telegramUser && (
                    <p className="text-slate-300 text-xs">
                      Connected to: <span className="font-bold text-white">{telegramUser.firstName}</span>{' '}
                      {telegramUser.username ? `(@${telegramUser.username})` : ''} (ID: {telegramUser.id})
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-slate-300 font-mono">
                      SESSION_STRING (Pyrogram v2 compatible)
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedSession, 'gen-session')}
                      className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      {copiedKey === 'gen-session' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Session String
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={generatedSession}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] break-all select-all focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('input');
                      setGeneratedSession(null);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
                  >
                    Generate Another
                  </button>
                  {openedFromConfig && (
                    <button
                      id="btn-use-session-in-settings"
                      type="button"
                      onClick={() => {
                        if (onSessionGenerated && generatedSession) {
                          onSessionGenerated(generatedSession, apiId, apiHash);
                        }
                        onClose();
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-100" />
                      Use in Settings &amp; Return
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}



        {/* Tab 3: Step-by-Step Guide to get API_ID & API_HASH */}
        {activeTab === 'guide' && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-sky-200">
                  How to get your Telegram API_ID and API_HASH
                </span>
                <a
                  href="https://my.telegram.org/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
                >
                  Open my.telegram.org <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-300">
                Telegram requires every developer app to have an <code className="text-sky-300">API_ID</code> and{' '}
                <code className="text-sky-300">API_HASH</code> to access their MTProto user API.
              </p>
            </div>

            <ol className="space-y-3 list-decimal list-inside text-slate-300 pl-1">
              <li className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <strong className="text-white">Go to Telegram Developer Portal:</strong> Visit{' '}
                <a
                  href="https://my.telegram.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  https://my.telegram.org
                </a>
                .
              </li>
              <li className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <strong className="text-white">Sign In:</strong> Enter your phone number with your country code (e.g.{' '}
                <code className="text-sky-300">+60123456789</code>). Telegram will send a confirmation code via chat
                notification to your Telegram app.
              </li>
              <li className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <strong className="text-white">Navigate to API Tools:</strong> Click on{' '}
                <span className="text-sky-300 font-semibold">"API development tools"</span>.
              </li>
              <li className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-white">Create App:</strong> If you don't already have an app, fill in:
                <ul className="list-disc list-inside pl-4 text-slate-400 space-y-0.5 mt-1">
                  <li>
                    <strong className="text-slate-300">App title:</strong> <code className="text-slate-200">BioScrobbler</code>
                  </li>
                  <li>
                    <strong className="text-slate-300">Short name:</strong> <code className="text-slate-200">scrobbler</code>
                  </li>
                  <li>
                    <strong className="text-slate-300">Platform:</strong> <code className="text-slate-200">Other</code> or{' '}
                    <code className="text-slate-200">Desktop</code>
                  </li>
                </ul>
              </li>
              <li className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <strong className="text-white">Copy Credentials:</strong> Telegram will display your{' '}
                <span className="text-sky-300 font-mono font-semibold">App api_id</span> (numeric) and{' '}
                <span className="text-sky-300 font-mono font-semibold">App api_hash</span> (32 characters).
              </li>
            </ol>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 space-y-1">
              <span className="font-semibold flex items-center gap-1 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                Troubleshooting my.telegram.org "ERROR" message:
              </span>
              <p className="text-[11px] text-amber-200/90">
                If Telegram shows an error when creating an app, ensure the Short Name contains no spaces, disable any ad-blockers, or open the page in an incognito window.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Official MTProto Protocol &bull; Pyrogram &bull; GramJS</span>
        </div>
      </div>
    </div>
  );
};

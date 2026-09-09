import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatusOverview } from './components/StatusOverview';
import { DecisionTreeViewer } from './components/DecisionTreeViewer';
import { SimulationSandbox } from './components/SimulationSandbox';
import { LogsConsole } from './components/LogsConsole';
import { ConfigModal, ConfigDraft } from './components/ConfigModal';
import { TelegramSessionHelperModal } from './components/TelegramSessionHelperModal';
import { RunnerStatus, LogEntry } from './types';

export default function App() {
  const [status, setStatus] = useState<RunnerStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSessionHelperOpen, setIsSessionHelperOpen] = useState(false);
  const [openedHelperFromConfig, setOpenedHelperFromConfig] = useState(false);

  // Settings draft state - preserves all user-keyed inputs even when navigating to helper or before saving
  const [configDraft, setConfigDraft] = useState<ConfigDraft>({
    username: '',
    apiKey: '',
    apiId: '',
    apiHash: '',
    sessionString: '',
    pollInterval: 30,
    bioMaxLen: 140,
  });

  const fetchStatusAndLogs = async () => {
    try {
      const [resStatus, resLogs] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/logs'),
      ]);

      const statusType = resStatus.headers.get('content-type') || '';
      if (resStatus.ok && statusType.includes('application/json')) {
        const data = await resStatus.json();
        setStatus(data);
      }

      const logsType = resLogs.headers.get('content-type') || '';
      if (resLogs.ok && logsType.includes('application/json')) {
        const data = await resLogs.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      // Suppress transient gateway/reboot errors during polling
      console.warn('Bot status/logs sync pending:', e instanceof Error ? e.message : e);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleRun = async () => {
    try {
      const res = await fetch('/api/bot/toggle', { method: 'POST' });
      if (res.ok) {
        await fetchStatusAndLogs();
      }
    } catch (e) {
      console.error('Failed to toggle bot runner:', e);
    }
  };

  const handleForceCheck = async () => {
    setLoading(true);
    try {
      await fetch('/api/bot/check', { method: 'POST' });
      await fetchStatusAndLogs();
    } catch (e) {
      console.error('Failed to trigger manual check:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSong = async (song: string, artist: string, isPlaying: boolean) => {
    try {
      await fetch('/api/bot/simulate-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, artist, isPlaying }),
      });
      await fetchStatusAndLogs();
    } catch (e) {
      console.error('Failed to simulate song:', e);
    }
  };

  const handleClearSimulatedSong = async () => {
    try {
      await fetch('/api/bot/simulate-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song: '', artist: '', isPlaying: true }),
      });
      await fetchStatusAndLogs();
    } catch (e) {
      console.error('Failed to clear simulated song:', e);
    }
  };

  const handleSimulateManualBio = async (bio: string) => {
    try {
      await fetch('/api/bot/simulate-manual-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      await fetchStatusAndLogs();
    } catch (e) {
      console.error('Failed to simulate manual bio edit:', e);
    }
  };

  const handleFastForward = async (hours: number) => {
    try {
      await fetch('/api/bot/fast-forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      await fetchStatusAndLogs();
    } catch (e) {
      console.error('Failed to fast forward:', e);
    }
  };

  const handleResetState = async () => {
    try {
      await fetch('/api/bot/reset-state', { method: 'POST' });
      await fetchStatusAndLogs();
    } catch (e) {
      console.error('Failed to reset state:', e);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  const handleSaveConfig = async (cfg: {
    newPollInterval: number;
    newBioMaxLen: number;
    newUsername: string;
    newApiKey: string;
    newApiId?: string;
    newApiHash?: string;
    newSessionString?: string;
  }) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      await fetchStatusAndLogs();
      setConfigDraft((prev) => ({
        ...prev,
        username: cfg.newUsername,
        apiKey: cfg.newApiKey,
        apiId: cfg.newApiId ?? prev.apiId,
        apiHash: cfg.newApiHash ?? prev.apiHash,
        sessionString: cfg.newSessionString ?? prev.sessionString,
        pollInterval: cfg.newPollInterval,
        bioMaxLen: cfg.newBioMaxLen,
      }));
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  };

  const handleApplyCredentials = async (
    targetApiId: string,
    targetApiHash: string,
    targetSessionString: string
  ) => {
    try {
      const res = await fetch('/api/telegram/apply-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetApiId, targetApiHash, targetSessionString }),
      });
      if (res.ok) {
        await fetchStatusAndLogs();
        setConfigDraft((prev) => ({
          ...prev,
          apiId: targetApiId || prev.apiId,
          apiHash: targetApiHash || prev.apiHash,
          sessionString: targetSessionString || prev.sessionString,
        }));
      }
    } catch (e) {
      console.error('Failed to apply credentials:', e);
      throw e;
    }
  };

  // Navigating to helper from Config modal preserves draft inputs and auto-fills them in the popup
  const handleOpenHelperFromConfig = () => {
    setIsConfigOpen(false);
    setOpenedHelperFromConfig(true);
    setIsSessionHelperOpen(true);
  };

  // When closing helper, if opened from Config, return to Config with all inputs preserved
  const handleCloseSessionHelper = () => {
    setIsSessionHelperOpen(false);
    if (openedHelperFromConfig) {
      setIsConfigOpen(true);
      setOpenedHelperFromConfig(false);
    }
  };

  // When a session is generated or chosen in the helper modal, sync it back to the settings draft
  const handleSessionGenerated = (
    newSession: string,
    targetApiId?: string,
    targetApiHash?: string
  ) => {
    setConfigDraft((prev) => ({
      ...prev,
      sessionString: newSession,
      ...(targetApiId ? { apiId: targetApiId } : {}),
      ...(targetApiHash ? { apiHash: targetApiHash } : {}),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation / Status Header */}
      <Header
        status={status}
        loading={loading}
        onToggleRun={handleToggleRun}
        onForceCheck={handleForceCheck}
        onOpenConfig={() => {
          setOpenedHelperFromConfig(false);
          setIsConfigOpen(true);
        }}
        onOpenSessionHelper={() => {
          setOpenedHelperFromConfig(false);
          setIsSessionHelperOpen(true);
        }}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Row 1: Status Overview (Now Playing, Telegram Bio Preview with Marker, 24h Override) */}
        <StatusOverview
          status={status}
          onFastForward={handleFastForward}
          onResetState={handleResetState}
          onOpenSessionHelper={() => {
            setOpenedHelperFromConfig(false);
            setIsSessionHelperOpen(true);
          }}
        />

        {/* Row 2: Live Decision Tree Route */}
        <DecisionTreeViewer status={status} />

        {/* Row 3: Interactive Simulation Sandbox */}
        <SimulationSandbox
          currentSimulatedSong={status?.simulatedSong ?? null}
          onSimulateSong={handleSimulateSong}
          onClearSimulatedSong={handleClearSimulatedSong}
          onSimulateManualBio={handleSimulateManualBio}
          onFastForward={handleFastForward}
        />

        {/* Row 4: Real-time Structured Logs Console */}
        <LogsConsole logs={logs} onClearLogs={handleClearLogs} />
      </main>

      {/* Settings Modal */}
      {isConfigOpen && (
        <ConfigModal
          isOpen={isConfigOpen}
          status={status}
          onClose={() => setIsConfigOpen(false)}
          onOpenSessionHelper={handleOpenHelperFromConfig}
          onSaveConfig={handleSaveConfig}
          draft={configDraft}
          onDraftChange={setConfigDraft}
        />
      )}

      {/* Telegram Session String & API Helper Modal */}
      {isSessionHelperOpen && (
        <TelegramSessionHelperModal
          isOpen={isSessionHelperOpen}
          status={status}
          initialApiId={configDraft.apiId}
          initialApiHash={configDraft.apiHash}
          initialSessionString={configDraft.sessionString}
          openedFromConfig={openedHelperFromConfig}
          onClose={handleCloseSessionHelper}
          onApplyCredentials={handleApplyCredentials}
          onSessionGenerated={handleSessionGenerated}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Telegram Bio Scrobbler &bull; Migrated to Node.js &amp; Vite for AI Studio &bull; Original repo: kunterk/telegram-bio-scrobble
      </footer>
    </div>
  );
}

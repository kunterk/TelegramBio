import React, { useState } from 'react';
import { Play, Music, UserCheck, ShieldAlert, Sliders, RefreshCw, Sparkles } from 'lucide-react';

interface SimulationSandboxProps {
  currentSimulatedSong: string | null;
  onSimulateSong: (song: string, artist: string, isPlaying: boolean) => void;
  onClearSimulatedSong: () => void;
  onSimulateManualBio: (bio: string) => void;
  onFastForward: (hours: number) => void;
}

const SAMPLE_TRACKS = [
  { song: 'Bohemian Rhapsody', artist: 'Queen' },
  { song: 'Starboy', artist: 'The Weeknd' },
  { song: 'Midnight City', artist: 'M83' },
  { song: 'Stairway to Heaven', artist: 'Led Zeppelin' },
];

export const SimulationSandbox: React.FC<SimulationSandboxProps> = ({
  currentSimulatedSong,
  onSimulateSong,
  onClearSimulatedSong,
  onSimulateManualBio,
  onFastForward,
}) => {
  const [customSong, setCustomSong] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [manualBioInput, setManualBioInput] = useState('');

  const handleSimulateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSong.trim() || customArtist.trim()) {
      onSimulateSong(customSong.trim() || 'Untitled Track', customArtist.trim() || 'Unknown Artist', isPlaying);
      setCustomSong('');
      setCustomArtist('');
    }
  };

  const handleApplyManualBio = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBioInput.trim()) {
      onSimulateManualBio(manualBioInput.trim());
      setManualBioInput('');
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Interactive Simulation &amp; Testing Sandbox
          </h2>
        </div>
        <span className="text-xs text-slate-400">Test Bot Reactions</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Music Playback Simulation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              Simulate Track Change
            </span>
            {currentSimulatedSong && (
              <button
                id="btn-clear-simulated-song"
                onClick={onClearSimulatedSong}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-mono underline"
              >
                Reset to Live API
              </button>
            )}
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_TRACKS.map((t) => (
              <button
                key={t.song}
                id={`btn-preset-${t.song.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => onSimulateSong(t.song, t.artist, true)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                {t.song} - {t.artist}
              </button>
            ))}
          </div>

          {/* Custom track form */}
          <form onSubmit={handleSimulateTrack} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                id="input-sim-song"
                type="text"
                placeholder="Song Title"
                value={customSong}
                onChange={(e) => setCustomSong(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <input
                id="input-sim-artist"
                type="text"
                placeholder="Artist Name"
                value={customArtist}
                onChange={(e) => setCustomArtist(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input
                  id="chk-now-playing"
                  type="checkbox"
                  checked={isPlaying}
                  onChange={(e) => setIsPlaying(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0"
                />
                <span>Set as Currently Playing (🎶)</span>
              </label>
              <button
                id="btn-submit-sim-track"
                type="submit"
                className="px-3 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Trigger Song
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Manual Bio Simulation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              Simulate Manual Bio Edit
            </span>
            <span className="text-[11px] text-slate-400">Tests 24h grace period</span>
          </div>

          {/* Quick presets for manual bio */}
          <div className="flex flex-wrap gap-1.5">
            {['Coding late night ☕', 'Vacation mode on 🌴', 'Focusing... 📵'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSimulateManualBio(preset)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                "{preset}"
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSimulateManualBio('')}
              className="text-xs px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 transition-colors"
            >
              Empty Bio
            </button>
          </div>

          <form onSubmit={handleApplyManualBio} className="space-y-2">
            <div className="relative">
              <input
                id="input-manual-bio"
                type="text"
                placeholder="Enter manual bio text without invisible marker..."
                maxLength={140}
                value={manualBioInput}
                onChange={(e) => setManualBioInput(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {manualBioInput.length}/140 chars
              </span>
              <button
                id="btn-apply-manual-bio"
                type="submit"
                className="px-3 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
              >
                Save as Manual Bio
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

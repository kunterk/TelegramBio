import React, { useState } from 'react';
import { Terminal, Trash2, Search, Check, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { LogEntry } from '../types';

interface LogsConsoleProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const LogsConsole: React.FC<LogsConsoleProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery.trim() && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
      case 'WARNING':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      default:
        return 'text-sky-400 bg-sky-950/60 border-sky-800';
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      {/* Console Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Structured Execution Logs
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {filteredLogs.length} events
          </span>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
            {['ALL', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                id={`filter-log-${lvl.toLowerCase()}`}
                type="button"
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                  filterLevel === lvl
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              id="input-log-search"
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 sm:w-44"
            />
          </div>

          {/* Clear button */}
          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            title="Clear logs"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 hover:border-rose-900 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Window */}
      <div className="rounded-lg bg-slate-950 border border-slate-800 p-3.5 h-64 overflow-y-auto font-mono text-xs space-y-1.5">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No log entries match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-slate-900/50 p-1 rounded">
              <span className="text-slate-500 select-none text-[11px] whitespace-nowrap">
                {log.timestamp}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold select-none ${getBadgeStyle(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

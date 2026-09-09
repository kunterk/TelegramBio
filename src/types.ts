export interface BotState {
  last_song: string;
  manual_timestamp: number;
}

export interface TrackInfo {
  song: string;
  artist: string;
  nowPlaying: boolean;
  album?: string;
  image?: string;
  rawFormatted: string;
}

export interface RunnerStatus {
  isRunning: boolean;
  pollInterval: number;
  bioMaxLen: number;
  lastChecked: number | null;
  lastSong: string;
  manualTimestamp: number;
  currentBio: string;
  isBotManaged: boolean;
  inGracePeriod: boolean;
  gracePeriodRemainingSeconds: number;
  backoff: number;
  consecutiveFailures: number;
  lastError: string | null;
  username: string;
  hasApiKey: boolean;
  simulatedSong?: string | null;
  hasTelegramCredentials?: boolean;
  apiIdConfigured?: boolean;
  apiHashConfigured?: boolean;
  sessionStringConfigured?: boolean;
  maskedApiId?: string;
}

export interface TelegramGeneratedScripts {
  pythonScript: string;
  pythonOneLiner: string;
  nodeScript: string;
  apiId: string;
  apiHash: string;
}

export interface TelegramValidationResult {
  apiIdValid: boolean;
  apiHashValid: boolean;
  sessionStringValid: boolean;
  allValid: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface AppConfig {
  apiId: string;
  apiHash: string;
  sessionString: string;
  lastfmApiKey: string;
  lastfmUsername: string;
  pollInterval: number;
  bioMaxLen: number;
}

export interface Mistake {
  segment: string;
  issue: string;
  tip: string;
}

export interface EvaluationResult {
  score: number;
  transcription: string;
  mistakes: Mistake[];
}

export type ModelStatus = "idle" | "loading" | "ready" | "error";

export interface DownloadProgress {
  loaded: number;
  total: number;
}

export interface DownloadsState {
  [filename: string]: DownloadProgress;
}

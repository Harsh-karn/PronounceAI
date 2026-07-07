import { Loader2 } from "lucide-react";
import { DownloadsState, ModelStatus } from "../types";

interface ModelDownloadProgressProps {
  modelStatus: ModelStatus;
  downloads: DownloadsState;
  error: string | null;
  onRetry: () => void;
}

export function ModelDownloadProgress({ modelStatus, downloads, error, onRetry }: ModelDownloadProgressProps) {
  if (modelStatus === "error") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-red-900">Failed to Load AI Model</h3>
          <p className="text-sm text-red-800 max-w-sm">
            {error || "An unknown error occurred while downloading the model."}
          </p>
        </div>
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Retry Download
        </button>
      </div>
    );
  }

  if (modelStatus !== "ready") {
    const totalLoadedBytes = Object.values(downloads).reduce((acc, curr) => acc + curr.loaded, 0);
    const totalModelBytes = Object.values(downloads).reduce((acc, curr) => acc + curr.total, 0);
    const loadingProgress = totalModelBytes > 0 ? (totalLoadedBytes / totalModelBytes) * 100 : 0;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-12 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-slate-800">
            {modelStatus === "idle" ? "Preparing AI Engine..." : "Downloading On-Device AI Model (Privacy First)..."}
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            This ~40MB model will be cached in your browser. All speech processing happens locally on your machine.
          </p>
          
          {modelStatus === "loading" && (
            <div className="w-full max-w-xs space-y-2 mt-2 mx-auto">
              <div className="flex justify-between text-xs font-medium text-blue-700">
                <span>Downloading...</span>
                <span>
                  {Math.round(totalLoadedBytes / 1024 / 1024)}MB 
                  {totalModelBytes > 0 ? ` / ${Math.round(totalModelBytes / 1024 / 1024)}MB` : ''}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, loadingProgress)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

import { Mic, Square, Upload, FileAudio, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface RecorderInterfaceProps {
  isRecording: boolean;
  recordingTime: number;
  hasAudio: boolean;
  isEvaluating: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmit: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RecorderInterface({
  isRecording,
  recordingTime,
  hasAudio,
  isEvaluating,
  onStartRecording,
  onStopRecording,
  onSubmit,
  onFileUpload,
}: RecorderInterfaceProps) {
  
  if (isEvaluating) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Evaluating Pronunciation...</h2>
          <p className="text-sm text-slate-500">Transcribing and analyzing with Gemini AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-12">
      <div className="flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl font-mono font-bold tracking-tight text-slate-800">
            00:{recordingTime.toString().padStart(2, "0")}
          </div>
          <div className="text-sm text-slate-500 font-medium">Requires 30 - 45 seconds</div>
        </div>

        <div className="relative group">
          {isRecording && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-red-500 rounded-full z-0"
            />
          )}
          
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`
              relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-95
              ${isRecording 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
              }
            `}
            aria-label={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
          </button>
        </div>

        <div className="flex items-center w-full max-w-sm gap-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">OR</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <label className="flex items-center gap-2 px-6 py-3 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer group">
          <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span>Upload Audio File</span>
          <input 
            type="file" 
            accept="audio/*" 
            className="hidden" 
            onChange={onFileUpload}
          />
        </label>
      </div>

      {hasAudio && !isRecording && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-full font-medium">
            <FileAudio className="w-4 h-4" />
            Audio ready for evaluation
          </div>
          <button
            onClick={onSubmit}
            className="w-full max-w-xs py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-md transition-all active:scale-95"
          >
            Evaluate Pronunciation
          </button>
        </motion.div>
      )}
    </div>
  );
}

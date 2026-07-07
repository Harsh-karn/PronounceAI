import { RotateCcw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { EvaluationResult } from "../types";

interface EvaluationResultsProps {
  result: EvaluationResult;
  onReset: () => void;
}

export function EvaluationResults({ result, onReset }: EvaluationResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-50 border-green-200";
    if (score >= 70) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className={`border rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 ${getScoreBg(result.score)}`}>
        <div className="relative flex-shrink-0 flex flex-col items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full bg-white shadow-sm border border-white/50">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
            <circle 
              cx="50" cy="50" r="46" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeDasharray={`${result.score * 2.89} 289`}
              className={`${getScoreColor(result.score)} transition-all duration-1000 ease-out`} 
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-4xl md:text-5xl font-black tracking-tighter ${getScoreColor(result.score)}`}>
              {result.score}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Score</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 text-center md:text-left">
          <h2 className="text-2xl font-bold text-slate-800">Transcription</h2>
          <div className="bg-white/60 p-4 rounded-xl border border-white/40 text-slate-700 leading-relaxed italic shadow-sm">
            "{result.transcription}"
          </div>
        </div>
      </div>

      {result.mistakes.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-800">Areas for Improvement</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {result.mistakes.map((mistake, idx) => (
              <div key={idx} className="p-6 flex flex-col md:flex-row gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="md:w-1/3 space-y-1">
                  <div className="inline-flex px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-sm font-bold font-mono border border-red-100">
                    "{mistake.segment}"
                  </div>
                  <div className="text-sm font-medium text-slate-500 uppercase tracking-wide text-xs">
                    {mistake.issue}
                  </div>
                </div>
                <div className="md:w-2/3 text-slate-600 bg-white border border-slate-100 rounded-lg p-4 shadow-sm">
                  {mistake.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
          <h3 className="text-xl font-bold text-green-800">Perfect Pronunciation!</h3>
          <p className="text-green-700">We couldn't detect any major pronunciation issues or filler words.</p>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-full shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Try Another Recording
        </button>
      </div>
    </motion.div>
  );
}

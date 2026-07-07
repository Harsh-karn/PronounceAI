import { ShieldCheck } from "lucide-react";

interface PrivacyConsentProps {
  consentGiven: boolean;
  onConsentChange: (consent: boolean) => void;
}

export function PrivacyConsent({ consentGiven, onConsentChange }: PrivacyConsentProps) {
  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-8">
      <div className="flex gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-blue-900">
            Perfect Privacy (DPDP Act 2023 Compliant)
          </h3>
          <p className="text-xs text-blue-700 leading-relaxed max-w-xl">
            Your audio is processed entirely on your device using a WebAssembly ML model. 
            No audio is ever uploaded to any server.
          </p>
          <label className="flex items-center gap-2 mt-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => onConsentChange(e.target.checked)}
              className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
            />
            <span className="text-sm text-blue-800 font-medium group-hover:text-blue-900 transition-colors">
              I understand and consent to local processing.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

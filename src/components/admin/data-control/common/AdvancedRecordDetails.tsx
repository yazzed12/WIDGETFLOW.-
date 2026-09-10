import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Terminal } from 'lucide-react';
import { copyToClipboard } from './entityResolvers';

interface AdvancedRecordDetailsProps {
  recordId?: string;
  data?: Record<string, unknown> | null;
  systemFields?: Array<{ label: string; value: unknown }>;
  className?: string;
  defaultExpanded?: boolean;
}

export const AdvancedRecordDetails: React.FC<AdvancedRecordDetailsProps> = ({
  recordId,
  data,
  systemFields = [],
  className = '',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, val: string) => {
    const ok = await copyToClipboard(val);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Advanced System Details
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            (Support &amp; Technical Identifiers)
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
          {recordId && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  System Identifier (UUID)
                </span>
                <code className="text-xs font-mono text-slate-700 break-all">{recordId}</code>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('id', recordId)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0 ml-3"
                title="Copy System Identifier"
              >
                {copiedKey === 'id' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {systemFields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemFields.map(({ label, value }) => {
                const valStr = String(value ?? '—');
                return (
                  <div
                    key={label}
                    className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {label}
                      </span>
                      <span className="text-xs font-mono text-slate-700 truncate block">
                        {valStr}
                      </span>
                    </div>
                    {valStr !== '—' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(label, valStr)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === label ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data && Object.keys(data).length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Raw Record Payload
              </span>
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

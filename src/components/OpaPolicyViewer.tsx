import React, { useState } from 'react';
import { OpaRuleEvaluation } from '../types/compiler';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Copy, 
  Check, 
  Play, 
  FileCode, 
  AlertTriangle, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';

interface OpaPolicyViewerProps {
  regoCode: string;
  evaluations: OpaRuleEvaluation[];
  passed: boolean;
  enforcedBudget: number;
  currentCost: number;
}

export const OpaPolicyViewer: React.FC<OpaPolicyViewerProps> = ({
  regoCode,
  evaluations,
  passed,
  enforcedBudget,
  currentCost
}) => {
  const [activeTab, setActiveTab] = useState<'evaluations' | 'rego'>('evaluations');
  const [copied, setCopied] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(regoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReEvaluate = () => {
    setEvaluating(true);
    setTimeout(() => {
      setEvaluating(false);
    }, 600);
  };

  const passedCount = evaluations.filter(e => e.status === 'PASS').length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Top Bar */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {passed ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              OPA (Open Policy Agent) Governance
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                passed 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {passed ? `PASSED (${passedCount}/${evaluations.length})` : 'POLICY VIOLATION'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic Rego evaluation against Terraform plan & Infracost telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('evaluations')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'evaluations'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Policy Rules ({evaluations.length})
            </button>
            <button
              onClick={() => setActiveTab('rego')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'rego'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Rego Source Code
            </button>
          </div>

          <button
            onClick={handleReEvaluate}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
          >
            <Play className={`w-3 h-3 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Evaluating...' : 'Eval Policy'}
          </button>
        </div>
      </div>

      {/* Tab 1: Evaluations list */}
      {activeTab === 'evaluations' && (
        <div className="p-5 space-y-3">
          {/* Budget Limit Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Enforced Monthly Budget Ceiling: ${enforcedBudget.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Plan estimate is <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">${currentCost.toFixed(2)}</span> ({Math.round((currentCost / enforcedBudget) * 100)}% utilization)
                </div>
              </div>
            </div>

            <div className="w-48 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${currentCost <= enforcedBudget ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, (currentCost / enforcedBudget) * 100)}%` }}
              />
            </div>
          </div>

          {/* Rules List */}
          <div className="grid grid-cols-1 gap-2.5">
            {evaluations.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.status === 'PASS' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {item.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-500" />}
                    {item.status === 'WARN' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.rule}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {item.description}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      {item.detail}
                    </div>
                  </div>
                </div>

                <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  item.status === 'PASS' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Rego Code */}
      {activeTab === 'rego' && (
        <div className="p-4 bg-slate-950">
          <div className="flex justify-between items-center mb-2 text-xs text-slate-400">
            <span className="font-mono">policy/cost_governance.rego</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Rego'}
            </button>
          </div>
          <pre className="font-mono text-xs text-emerald-400 bg-slate-900 p-4 rounded-lg overflow-x-auto border border-slate-800 leading-relaxed max-h-[380px]">
            {regoCode}
          </pre>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { 
  MessageSquare, 
  Plus, 
  Sparkles, 
  TrendingDown, 
  ShieldCheck, 
  Database, 
  Cpu, 
  History 
} from 'lucide-react';

interface ChatSidebarProps {
  currentIntent: string;
  onSelectPrompt: (prompt: string, isCheaper?: boolean) => void;
  onNewSession: () => void;
  isCheaperOptimized: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentIntent,
  onSelectPrompt,
  onNewSession,
  isCheaperOptimized
}) => {
  const templates = [
    {
      title: "Queue with 10k msg/s + DLQ (<$100)",
      prompt: "I need a queue that handles 10k msg/sec, costs <$100, is private, and has DLQ",
      badge: "Core Feature",
      isCheaper: false
    },
    {
      title: "Cost Optimization: Kinesis Stream",
      prompt: "make it cheaper",
      badge: "58% Savings",
      isCheaper: true
    },
    {
      title: "Dedicated Apache Kafka (MSK)",
      prompt: "I need a managed Kafka MSK cluster with TLS encryption and multi-broker partitioning",
      badge: "Enterprise",
      isCheaper: false
    },
    {
      title: "Dev Environment Serverless Tier",
      prompt: "Compile light dev environment with Graviton Lambda and 4-day DLQ retention",
      badge: "Dev Tier",
      isCheaper: false
    }
  ];

  return (
    <aside className="w-72 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0">
      {/* New Compilation Button */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Infrastructure Intent</span>
        </button>
      </div>

      {/* Suggested Architecture Templates */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Intent Templates
          </div>
          <div className="space-y-1.5">
            {templates.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt(tpl.prompt, tpl.isCheaper)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs group ${
                  currentIntent === tpl.prompt
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {tpl.title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {tpl.badge}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2">
                  "{tpl.prompt}"
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 1-Click "Make it cheaper" Card */}
        {!isCheaperOptimized && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
              <TrendingDown className="w-4 h-4" />
              Cost Optimizer Available
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
              Say <strong className="text-slate-800 dark:text-slate-200">"make it cheaper"</strong> to swap SQS per-request fees for Kinesis fixed shard pricing.
            </p>
            <button
              onClick={() => onSelectPrompt("make it cheaper", true)}
              className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Recompile to Kinesis (-58%)
            </button>
          </div>
        )}

        {/* Compiler Pipeline Info */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400">
          <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Compiler Invariants Enforced
          </div>
          <div>• 100% Validated HCL 2.0</div>
          <div>• Rego OPA Cost Limit Enforcement</div>
          <div>• Isolated VPC Private Endpoint</div>
          <div>• Mandatory Dead-Letter Queue</div>
          <div>• Infracost AST Telemetry</div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-mono text-center">
        Go AST Engine • HashiCorp Terraform 1.7+
      </div>
    </aside>
  );
};

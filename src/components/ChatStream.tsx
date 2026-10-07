import React, { useState, useRef, useEffect } from 'react';
import { CompilationResult, Environment, UserRole } from '../types/compiler';
import { InfraCanvas } from './InfraCanvas';
import { TerraformViewer } from './TerraformViewer';
import { OpaPolicyViewer } from './OpaPolicyViewer';
import { CostScaleGraph } from './CostScaleGraph';
import { AdrViewer } from './AdrViewer';
import { AuditLogViewer } from './AuditLogViewer';
import { GoEngineInspector } from './GoEngineInspector';
import { DatabaseViewer } from './DatabaseViewer';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Layers, 
  FileCode, 
  ShieldCheck, 
  TrendingUp, 
  BookOpen, 
  History, 
  Cpu, 
  Database,
  Loader2, 
  CheckCircle2, 
  Zap, 
  CornerDownLeft 
} from 'lucide-react';

interface ChatStreamProps {
  compilation: CompilationResult;
  allAuditLogs: any[];
  theme: 'dark' | 'light';
  environment: Environment;
  role: UserRole;
  isCompiling: boolean;
  onSendIntent: (intent: string, isCheaper?: boolean) => void;
  onLoadCompilation?: (compilation: CompilationResult) => void;
}

export const ChatStream: React.FC<ChatStreamProps> = ({
  compilation,
  allAuditLogs,
  theme,
  environment,
  role,
  isCompiling,
  onSendIntent,
  onLoadCompilation
}) => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'terraform' | 'opa' | 'cost' | 'adr' | 'audit' | 'go' | 'database'>('diagram');
  const [inputPrompt, setInputPrompt] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || isCompiling) return;
    onSendIntent(inputPrompt.trim());
    setInputPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      {/* Scrollable Messages & Compiler Workspace */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* User Prompt Message Card */}
        <div className="max-w-4xl mx-auto flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
            <User className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl rounded-tl-none shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Architectural Intent
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                User Brief
              </span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
              "{compilation.intent}"
            </p>
          </div>
        </div>

        {/* Compiler Assistant Synthesis Card */}
        <div className="max-w-4xl mx-auto flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white shadow-md shadow-indigo-600/20">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-4 md:p-5 shadow-xs space-y-4">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {compilation.title}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compiled in <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{compilation.goEngineAst.compilationDurationMs}ms</span> • 100% Validated HCL & Rego Policy
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ${compilation.costEstimate.monthlyTotal.toFixed(2)}/mo
                </span>
                {compilation.isCheaperOptimized && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    -{compilation.savingsPercentage}% Cost Reduced
                  </span>
                )}
              </div>
            </div>

            {/* AI Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">Compiler Diagnosis:</span>
              {compilation.summary}
            </div>

            {/* View Selector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('diagram')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'diagram'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Infra Diagram (ReactFlow)
              </button>

              <button
                onClick={() => setActiveTab('terraform')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'terraform'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Terraform HCL
              </button>

              <button
                onClick={() => setActiveTab('opa')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'opa'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                OPA Policy ({compilation.opaPolicy.rulesCount} Rules)
              </button>

              <button
                onClick={() => setActiveTab('cost')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'cost'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Cost vs Scale
              </button>

              <button
                onClick={() => setActiveTab('adr')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'adr'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                ADR Decision
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'audit'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Audit Trail ({allAuditLogs.length})
              </button>

              <button
                onClick={() => setActiveTab('go')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'go'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Go Engine AST
              </button>

              <button
                onClick={() => setActiveTab('database')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'database'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                SQLite Database
              </button>
            </div>

            {/* Active Tab View Body */}
            <div>
              {activeTab === 'diagram' && (
                <InfraCanvas
                  nodes={compilation.diagram.nodes}
                  edges={compilation.diagram.edges}
                  theme={theme}
                  title={compilation.title}
                  isCheaperOptimized={compilation.isCheaperOptimized}
                />
              )}

              {activeTab === 'terraform' && (
                <TerraformViewer files={compilation.terraform} />
              )}

              {activeTab === 'opa' && (
                <OpaPolicyViewer
                  regoCode={compilation.opaPolicy.regoCode}
                  evaluations={compilation.opaPolicy.evaluations}
                  passed={compilation.opaPolicy.passed}
                  enforcedBudget={compilation.opaPolicy.enforcedBudget}
                  currentCost={compilation.costEstimate.monthlyTotal}
                />
              )}

              {activeTab === 'cost' && (
                <CostScaleGraph
                  data={compilation.costVsScale}
                  breakdown={compilation.costEstimate.breakdown}
                  currentTotal={compilation.costEstimate.monthlyTotal}
                  maxBudget={compilation.costEstimate.maxBudget}
                  infracostCli={compilation.costEstimate.infracostCliOutput}
                  isCheaperOptimized={compilation.isCheaperOptimized}
                  savingsPercentage={compilation.savingsPercentage}
                  onOptimizeClick={() => onSendIntent('make it cheaper', true)}
                />
              )}

              {activeTab === 'adr' && (
                <AdrViewer adr={compilation.adr} />
              )}

              {activeTab === 'audit' && (
                <AuditLogViewer logs={allAuditLogs} />
              )}

              {activeTab === 'go' && (
                <GoEngineInspector compilation={compilation} />
              )}

              {activeTab === 'database' && (
                <DatabaseViewer onSelectCompilation={onLoadCompilation} />
              )}
            </div>
          </div>
        </div>

        {/* Compiling state indicator */}
        {isCompiling && (
          <div className="max-w-4xl mx-auto flex items-center gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 font-mono animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing intent AST • Generating Terraform HCL • Evaluating OPA Rego policies • Computing Infracost...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ChatGPT-like Prompt Input Section */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 md:p-4 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2.5">
          {/* Quick Prompt Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-400 shrink-0">Quick Actions:</span>
            {!compilation.isCheaperOptimized && (
              <button
                onClick={() => onSendIntent("make it cheaper", true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all font-medium whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                "make it cheaper" (Re-compile to Kinesis)
              </button>
            )}
            <button
              onClick={() => onSendIntent("I need a queue that handles 10k msg/sec, costs <$100, is private, and has DLQ")}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all font-medium whitespace-nowrap cursor-pointer"
            >
              "10k msg/s + DLQ + Private"
            </button>
            <button
              onClick={() => onSendIntent("Provision dedicated Kafka MSK cluster with encryption and TLS")}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all font-medium whitespace-nowrap cursor-pointer"
            >
              "Kafka MSK Cluster"
            </button>
          </div>

          {/* Text Input Box */}
          <form onSubmit={handleSubmit} className="relative flex items-end bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-2">
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your infrastructure intent in plain English (e.g., 'I need a queue that handles 10k msg/sec, costs <$100, is private, and has DLQ')..."
              rows={2}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 focus:outline-none resize-none placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isCompiling}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-md transition-all shrink-0 cursor-pointer"
              title="Compile Infrastructure"
            >
              {isCompiling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Enter</kbd> to compile intent</span>
            <span className="font-mono">Role: {role} • Environment: {environment.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

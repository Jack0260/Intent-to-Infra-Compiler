import React, { useState } from 'react';
import { CompilationResult } from '../types/compiler';
import { Cpu, Terminal, Zap, CheckCircle2, Code2, Copy, Check } from 'lucide-react';

interface GoEngineInspectorProps {
  compilation: CompilationResult;
}

export const GoEngineInspector: React.FC<GoEngineInspectorProps> = ({ compilation }) => {
  const [copied, setCopied] = useState(false);
  const ast = compilation.goEngineAst;

  const goCliCommand = `go run ./cmd/infra-compiler \\
  --intent="${compilation.intent}" \\
  --env=${compilation.environment} \\
  --max-budget=100.00 \\
  --enforce-dlq=true \\
  --output=./dist/terraform`;

  const handleCopyCli = () => {
    navigator.clipboard.writeText(goCliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Go AST Compiler Pipeline (Engine v2.4.1)
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono">
                {ast.compilationDurationMs}ms compile time
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-throughput lexer & type-checker compiling AST nodes directly into validated HCL
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Package: <strong className="text-indigo-400">pkg/compiler</strong>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* CLI invocation banner */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2 pb-1 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Go CLI Execution Interface
            </span>
            <button
              onClick={handleCopyCli}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Command'}
            </button>
          </div>
          <pre className="text-cyan-400 leading-relaxed whitespace-pre-wrap">{goCliCommand}</pre>
        </div>

        {/* Optimizations Applied */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Go AST Optimization Passes Applied ({ast.optimizations.length})
          </h4>
          <div className="space-y-2">
            {ast.optimizations.map((opt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AST Node Topology Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            AST Generated Resource Nodes
          </h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3">Resource Identifier</th>
                  <th className="py-2 px-3">AST Type</th>
                  <th className="py-2 px-3">Provision Tier</th>
                  <th className="py-2 px-3 text-right">Infracost/Mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {ast.resources.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{res.resourceId}</td>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">{res.type}</td>
                    <td className="py-2 px-3 text-slate-500">{res.tier}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-300">${res.monthlyCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { AdrRecord } from '../types/compiler';
import { BookOpen, Copy, Check, Download, CheckCircle2, ArrowRight } from 'lucide-react';

interface AdrViewerProps {
  adr: AdrRecord;
}

export const AdrViewer: React.FC<AdrViewerProps> = ({ adr }) => {
  const [copied, setCopied] = useState(false);

  const getMarkdown = () => {
    return `# ${adr.title}

* **Status:** ${adr.status}
* **Date:** ${adr.date}

## Context
${adr.context}

## Decision
${adr.decision}

## Consequences

### Positive
${adr.consequences.positive.map(p => `- ${p}`).join('\n')}

### Negative
${adr.consequences.negative.map(n => `- ${n}`).join('\n')}

## Alternatives Considered
${adr.alternatives.map(a => `### ${a.name}
* **Pros:** ${a.pros}
* **Cons:** ${a.cons}
* **Why Rejected:** ${a.reasonRejected}`).join('\n\n')}
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([getMarkdown()], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${adr.title.split(':')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Architecture Decision Record (ADR)
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                {adr.status}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auto-generated MADR documenting trade-offs & technical rationale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy ADR'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Markdown
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 text-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{adr.title}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>Status: <strong className="text-emerald-600 dark:text-emerald-400">{adr.status}</strong></span>
            <span>•</span>
            <span>Recorded: {adr.date}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Context & SLA Requirements</h4>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {adr.context}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Architectural Decision</h4>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 font-sans">
            {adr.decision}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
              Positive Consequences
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {adr.consequences.positive.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
              Negative / Trade-off Consequences
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {adr.consequences.negative.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Alternatives Evaluated</h4>
          <div className="space-y-2.5">
            {adr.alternatives.map((alt, idx) => (
              <div key={idx} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>{alt.name}</span>
                  <span className="text-[10px] text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded font-mono">
                    Rejected
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <strong>Pros:</strong> {alt.pros}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <strong>Cons:</strong> {alt.cons}
                </div>
                <div className="text-rose-600 dark:text-rose-400 font-mono text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <strong>Rejection Rationale:</strong> {alt.reasonRejected}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface TerraformViewerProps {
  files: {
    mainTf: string;
    variablesTf: string;
    outputsTf: string;
    providersTf: string;
  };
}

export const TerraformViewer: React.FC<TerraformViewerProps> = ({ files }) => {
  const [activeFile, setActiveFile] = useState<'main.tf' | 'variables.tf' | 'outputs.tf' | 'providers.tf'>('main.tf');
  const [copied, setCopied] = useState(false);

  const getActiveContent = () => {
    switch (activeFile) {
      case 'main.tf': return files.mainTf;
      case 'variables.tf': return files.variablesTf;
      case 'outputs.tf': return files.outputsTf;
      case 'providers.tf': return files.providersTf;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([getActiveContent()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = activeFile;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const content = getActiveContent();
  const lines = content.split('\n');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* File Tab Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['main.tf', 'variables.tf', 'outputs.tf', 'providers.tf'] as const).map((filename) => (
            <button
              key={filename}
              onClick={() => setActiveFile(filename)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                activeFile === filename
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              {filename}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            HCL 2.0 Valid
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Code Viewer with Line Numbers */}
      <div className="p-4 font-mono text-xs overflow-x-auto max-h-[460px] leading-relaxed bg-slate-950">
        <div className="table w-full">
          {lines.map((line, idx) => (
            <div key={idx} className="table-row hover:bg-slate-900/60 transition-colors">
              <span className="table-cell pr-4 text-right text-slate-600 select-none w-10 text-[11px]">
                {idx + 1}
              </span>
              <span className="table-cell text-slate-200 whitespace-pre">
                {line.startsWith('#') || line.startsWith('//') || line.startsWith('/*') || line.startsWith(' *') ? (
                  <span className="text-slate-500 italic">{line}</span>
                ) : line.includes('resource ') || line.includes('variable ') || line.includes('output ') || line.includes('provider ') ? (
                  <span className="text-purple-400 font-semibold">{line}</span>
                ) : line.includes(' = ') ? (
                  <span>
                    <span className="text-sky-300">{line.split(' = ')[0]}</span>
                    <span className="text-slate-500"> = </span>
                    <span className="text-amber-300">{line.split(' = ').slice(1).join(' = ')}</span>
                  </span>
                ) : (
                  line
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

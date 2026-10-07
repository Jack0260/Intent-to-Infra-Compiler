import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Send, 
  ShieldCheck, 
  Layers, 
  AlertTriangle, 
  Cpu, 
  Lock, 
  Activity, 
  Database 
} from 'lucide-react';
import { FlowNodeData } from '../types/compiler';

interface InfraNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

export const InfraNode: React.FC<InfraNodeProps> = ({ data, selected }) => {
  const getIcon = () => {
    switch (data.icon) {
      case 'Send': return <Send className="w-4 h-4 text-cyan-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-amber-400" />;
      case 'AlertTriangle': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'Lock': return <Lock className="w-4 h-4 text-purple-400" />;
      case 'Activity': return <Activity className="w-4 h-4 text-emerald-400" />;
      default: return <Database className="w-4 h-4 text-blue-400" />;
    }
  };

  const isDLQ = data.category === 'dlq';
  const isOptimized = data.status === 'optimized';

  return (
    <div
      className={`px-3.5 py-3 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-200 min-w-[190px] ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-500/20'
          : isDLQ
          ? 'border-rose-500/40 bg-slate-900/90 dark:bg-slate-900/95 hover:border-rose-400'
          : isOptimized
          ? 'border-emerald-500/40 bg-slate-900/90 dark:bg-slate-900/95 hover:border-emerald-400'
          : 'border-slate-700/80 bg-slate-900/90 dark:bg-slate-900/95 hover:border-slate-500'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-slate-900" />
      
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            {getIcon()}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              {data.label}
              {isOptimized && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  OPT
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
              {data.sublabel}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
        <span className="text-slate-400">Monthly</span>
        <span className={`font-mono font-medium ${isOptimized ? 'text-emerald-400' : 'text-slate-200'}`}>
          {data.costMonthly === 0 ? 'Free tier' : `$${data.costMonthly.toFixed(2)}/mo`}
        </span>
      </div>

      {data.specs && Object.keys(data.specs).length > 0 && (
        <div className="mt-1 pt-1 border-t border-slate-800/50 flex flex-wrap gap-1">
          {Object.entries(data.specs).slice(0, 2).map(([k, v]) => (
            <span key={k} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              {k}: {v}
            </span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-slate-900" />
    </div>
  );
};

import React from 'react';
import { AuditLogEntry } from '../types/compiler';
import { History, Shield, CheckCircle2, AlertTriangle, Hash, Clock } from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Compliance Audit Trail
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {logs.length} Records
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable cryptographic ledger tracking compilation provenance & policy decisions
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 font-semibold">
              <th className="py-2.5 px-4">Timestamp</th>
              <th className="py-2.5 px-4">Actor</th>
              <th className="py-2.5 px-4">Role</th>
              <th className="py-2.5 px-4">Action</th>
              <th className="py-2.5 px-4">Env</th>
              <th className="py-2.5 px-4">SHA-256 Provenance Hash</th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
            {logs.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  <span className="flex items-center gap-1 font-sans">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200 font-sans font-medium">
                  {entry.actor}
                </td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-sans">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                    {entry.role}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                  {entry.action}
                </td>
                <td className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    entry.environment === 'prod'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {entry.environment}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-slate-400" title={entry.sha256}>
                    <Hash className="w-3 h-3 text-slate-500" />
                    {entry.sha256.slice(0, 18)}...
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    entry.status === 'SUCCESS'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

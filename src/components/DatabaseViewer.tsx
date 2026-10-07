import React, { useState, useEffect } from 'react';
import { Database, Table, HardDrive, RefreshCw, CheckCircle2, ArrowRight, Layers, FileCode } from 'lucide-react';

interface DatabaseViewerProps {
  onSelectCompilation?: (compilation: any) => void;
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ onSelectCompilation }) => {
  const [stats, setStats] = useState<any>({
    engine: 'SQLite 3 (WAL mode)',
    databaseFile: 'data/intent_compiler.db',
    totalCompilations: 0,
    totalAuditLogs: 0,
    status: 'ACTIVE_CONNECTED'
  });
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTable, setActiveTable] = useState<'compilations' | 'audit_logs'>('compilations');

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/db-stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const recRes = await fetch(activeTable === 'compilations' ? '/api/compilations' : '/api/audit-logs');
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecords(recData);
      }
    } catch (e) {
      console.warn('Failed to load database data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseInfo();
  }, [activeTable]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Persistent Database Engine
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                {stats.status}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Local high-performance SQLite engine with Write-Ahead Logging (WAL)
            </p>
          </div>
        </div>

        <button
          onClick={fetchDatabaseInfo}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Database</span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="text-[11px] text-slate-400 font-medium">Database File</div>
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              {stats.databaseFile}
            </div>
            <div className="text-[10px] text-emerald-500 mt-1 font-mono">
              Journal Mode: WAL
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="text-[11px] text-slate-400 font-medium">Table: compilations</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {stats.totalCompilations} records
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Full HCL, OPA & AST bundles
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="text-[11px] text-slate-400 font-medium">Table: audit_logs</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              {stats.totalAuditLogs} records
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              SHA-256 provenance ledger
            </div>
          </div>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTable('compilations')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTable === 'compilations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            SELECT * FROM compilations
          </button>
          <button
            onClick={() => setActiveTable('audit_logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTable === 'audit_logs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            SELECT * FROM audit_logs
          </button>
        </div>

        {/* Database Rows Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          {activeTable === 'compilations' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Intent Query</th>
                  <th className="py-2.5 px-3">Env</th>
                  <th className="py-2.5 px-3">Architecture</th>
                  <th className="py-2.5 px-3">Cost</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No records found in database
                    </td>
                  </tr>
                ) : (
                  records.map((r: any, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-indigo-500 font-bold">{r.id?.slice(0, 14)}...</td>
                      <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200 max-w-xs truncate">
                        "{r.intent}"
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-emerald-500">{r.environment}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{r.architectureType}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                        ${r.costEstimate?.monthlyTotal?.toFixed(2)}/mo
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {onSelectCompilation && (
                          <button
                            onClick={() => onSelectCompilation(r)}
                            className="px-2 py-1 text-[11px] rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-sans font-medium"
                          >
                            Load
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Env</th>
                  <th className="py-2.5 px-3">SHA-256</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {records.map((l: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-800 dark:text-slate-200">{l.actor}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-400">{l.action}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-emerald-500">{l.environment}</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[10px]">{l.sha256?.slice(0, 16)}...</td>
                    <td className="py-2.5 px-3 text-emerald-500 font-bold">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

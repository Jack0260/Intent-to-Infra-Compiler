import React, { useState } from 'react';
import { CostVsScalePoint, CostBreakdownItem } from '../types/compiler';
import { 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Terminal, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface CostScaleGraphProps {
  data: CostVsScalePoint[];
  breakdown: CostBreakdownItem[];
  currentTotal: number;
  maxBudget: number;
  infracostCli: string;
  isCheaperOptimized: boolean;
  savingsPercentage?: number;
  onOptimizeClick?: () => void;
}

export const CostScaleGraph: React.FC<CostScaleGraphProps> = ({
  data,
  breakdown,
  currentTotal,
  maxBudget,
  infracostCli,
  isCheaperOptimized,
  savingsPercentage,
  onOptimizeClick
}) => {
  const [activeTab, setActiveTab] = useState<'graph' | 'infracost' | 'cli'>('graph');
  const [hoveredPoint, setHoveredPoint] = useState<CostVsScalePoint | null>(null);

  // SVG Chart Dimensions
  const width = 640;
  const height = 280;
  const padding = { top: 25, right: 35, bottom: 45, left: 55 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxCost = 800; // max Y axis
  const minCost = 0;

  // Coordinate transformation helpers
  const getX = (index: number) => padding.left + (index / (data.length - 1)) * graphWidth;
  const getY = (cost: number) => padding.top + graphHeight - ((cost - minCost) / (maxCost - minCost)) * graphHeight;

  // Path generators
  const sqsPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.sqsCost)}`).join(' ');
  const kinesisPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.kinesisCost)}`).join(' ');
  const kafkaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.kafkaCost)}`).join(' ');

  // Budget threshold line Y
  const budgetY = getY(maxBudget);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Sub-header navigation */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Cost vs. Scale Elasticity Model
              {isCheaperOptimized && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                  {savingsPercentage}% Cost Reduced
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Infracost predictive economic curve from 1k to 100k msg/sec
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'graph'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Scale Graph
          </button>
          <button
            onClick={() => setActiveTab('infracost')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'infracost'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Infracost Items
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'cli'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Infracost CLI
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive Scale Graph */}
      {activeTab === 'graph' && (
        <div className="p-5">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Compiled Spend (at 10k msg/s)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  ${currentTotal.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">/ mo</span>
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Under $100 budget by ${(maxBudget - currentTotal).toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                Economic Crossover Point
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  ~3,500 msg/s
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Kinesis becomes 58% cheaper than SQS above 3.5k msg/s
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                  High Scale (100k msg/s) Spread
                </span>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  SQS: <span className="font-mono text-rose-500">$735/mo</span> vs Kinesis:{' '}
                  <span className="font-mono text-emerald-500">$142/mo</span>
                </div>
              </div>

              {!isCheaperOptimized && onOptimizeClick && (
                <button
                  onClick={onOptimizeClick}
                  className="mt-2 text-xs flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  "make it cheaper" → Recompile to Kinesis (-58%)
                </button>
              )}
            </div>
          </div>

          {/* SVG Chart */}
          <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-950 p-2 overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
              {/* Y Axis Gridlines & Labels */}
              {[0, 100, 250, 500, 750].map((costVal) => {
                const y = getY(costVal);
                return (
                  <g key={costVal}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      ${costVal}
                    </text>
                  </g>
                );
              })}

              {/* $100 Policy Budget Limit Line */}
              <line
                x1={padding.left}
                y1={budgetY}
                x2={width - padding.right}
                y2={budgetY}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <text
                x={width - padding.right}
                y={budgetY - 5}
                fill="#ef4444"
                fontSize="9"
                fontWeight="bold"
                textAnchor="end"
              >
                OPA Policy Ceiling ($100/mo)
              </text>

              {/* Crossover threshold highlight box */}
              <rect
                x={getX(1)}
                y={padding.top}
                width={getX(2) - getX(1)}
                height={graphHeight}
                fill="rgba(99, 102, 241, 0.08)"
              />

              {/* Data Lines */}
              {/* Apache Kafka MSK Line */}
              <path d={kafkaPath} fill="none" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="5 3" />
              {/* AWS SQS Line */}
              <path d={sqsPath} fill="none" stroke="#38bdf8" strokeWidth={2.5} />
              {/* AWS Kinesis Line */}
              <path d={kinesisPath} fill="none" stroke="#10b981" strokeWidth={3} />

              {/* Interactive Data Points */}
              {data.map((pt, i) => {
                const x = getX(i);
                return (
                  <g key={pt.throughput}>
                    {/* X Axis Label */}
                    <text
                      x={x}
                      y={height - 15}
                      fill="#94a3b8"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {pt.throughput}
                    </text>

                    {/* SQS Node */}
                    <circle
                      cx={x}
                      cy={getY(pt.sqsCost)}
                      r={hoveredPoint?.throughput === pt.throughput ? 6 : 4}
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth={2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />

                    {/* Kinesis Node */}
                    <circle
                      cx={x}
                      cy={getY(pt.kinesisCost)}
                      r={hoveredPoint?.throughput === pt.throughput ? 6 : 4.5}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth={2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div className="absolute top-4 left-16 p-3 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                  Throughput: {hoveredPoint.throughput} ({hoveredPoint.throughputNum.toLocaleString()} msg/sec)
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sky-400">AWS SQS + Lambda:</span>
                  <span className="font-mono font-bold text-slate-100">${hoveredPoint.sqsCost.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-emerald-400">AWS Kinesis + Lambda:</span>
                  <span className="font-mono font-bold text-emerald-300">
                    ${hoveredPoint.kinesisCost.toFixed(2)}/mo
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-purple-400">Apache Kafka MSK:</span>
                  <span className="font-mono text-slate-400">${hoveredPoint.kafkaCost.toFixed(2)}/mo</span>
                </div>
                <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                  Recommended Architecture: <span className="text-emerald-400 font-bold uppercase">{hoveredPoint.recommended}</span>
                </div>
              </div>
            )}
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                SQS + Lambda (Per-Request Pay-As-You-Go)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Kinesis + Lambda (Shard Provisioned - High Volume Winner)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-purple-500" />
              <span className="text-slate-500 dark:text-slate-400">
                Managed Kafka (Amazon MSK - High Baseline)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Infracost Items Breakdown Table */}
      {activeTab === 'infracost' && (
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Resource</th>
                  <th className="py-2.5 px-3 font-semibold">Category</th>
                  <th className="py-2.5 px-3 font-semibold">Usage Model</th>
                  <th className="py-2.5 px-3 font-semibold">Unit Price</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Monthly Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {breakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {item.resource}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-sans">
                      {item.usage}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {item.unitPrice}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 text-right">
                      ${item.monthlyCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-mono font-bold text-sm bg-slate-50/50 dark:bg-slate-800/20">
                  <td colSpan={4} className="py-3 px-3 text-slate-800 dark:text-slate-200 font-sans">
                    Total Compiled Infrastructure Estimate
                  </td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 text-right">
                    ${currentTotal.toFixed(2)} / mo
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: CLI ASCII View */}
      {activeTab === 'cli' && (
        <div className="p-5">
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner leading-relaxed">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                infracost breakdown --path . --format table
              </span>
              <span>v0.10.35</span>
            </div>
            <pre className="whitespace-pre">{infracostCli}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

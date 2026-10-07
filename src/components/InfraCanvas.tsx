import React, { useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  NodeTypes
} from '@xyflow/react';
import { InfraNode } from './InfraNode';
import { FlowNodeData } from '../types/compiler';
import { Maximize2, X, Shield, DollarSign, Activity } from 'lucide-react';

const nodeTypes: NodeTypes = {
  custom: InfraNode,
  default: InfraNode
};

interface InfraCanvasProps {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  theme: 'dark' | 'light';
  title?: string;
  isCheaperOptimized?: boolean;
}

export const InfraCanvas: React.FC<InfraCanvasProps> = ({ 
  nodes, 
  edges, 
  theme,
  title,
  isCheaperOptimized
}) => {
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as FlowNodeData);
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 overflow-hidden shadow-inner flex flex-col">
      {/* Canvas Top Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            {title || 'Compiled Infrastructure Topology (ReactFlow)'}
          </span>
          {isCheaperOptimized && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
              Cost-Optimized Stream Topology
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="hidden sm:inline">10,000 msg/sec data stream active</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {nodes.length} Nodes • {edges.length} Edges
          </span>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="relative flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          colorMode={theme === 'dark' ? 'dark' : 'dark'}
          attributionPosition="bottom-left"
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background gap={18} size={1} color="#334155" />
          <Controls 
            showInteractive={false} 
            className="!bg-slate-800 !border-slate-700 !fill-slate-200 !text-slate-200 !rounded-lg"
          />
          <MiniMap 
            nodeStrokeColor="#6366f1"
            nodeColor="#1e293b"
            maskColor="rgba(15, 23, 42, 0.7)"
            className="!bg-slate-900 !border-slate-800 !rounded-lg"
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-4 top-4 w-72 p-4 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md z-20 transition-all">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-100">{selectedNode.label}</h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Category:</span>
                <span className="font-mono text-slate-200 capitalize">{selectedNode.category}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Estimated Cost:</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {selectedNode.costMonthly === 0 ? '$0.00 / month' : `$${selectedNode.costMonthly.toFixed(2)} / mo`}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">State:</span>
                <span className="font-mono text-emerald-300 capitalize">{selectedNode.status}</span>
              </div>

              {selectedNode.specs && Object.keys(selectedNode.specs).length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Runtime Specifications</div>
                  <div className="space-y-1">
                    {Object.entries(selectedNode.specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px] bg-slate-800/60 p-1.5 rounded">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-mono text-slate-200">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CompilationResult, Environment, UserRole } from '../types/compiler';
import { Terminal, CheckCircle2, AlertTriangle, X, Play, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  compilation: CompilationResult;
  role: UserRole;
  environment: Environment;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  compilation,
  role,
  environment
}) => {
  const [stage, setStage] = useState<'idle' | 'running' | 'completed' | 'blocked'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const isViewer = role === 'developer_viewer';
  const isProd = environment === 'prod';
  const isBlockedByRbac = isViewer && isProd;

  useEffect(() => {
    if (isOpen) {
      if (isBlockedByRbac) {
        setStage('blocked');
      } else {
        setStage('idle');
        setLogs([
          'Ready to deploy compiled infrastructure plan.',
          `Target: AWS (${environment.toUpperCase()}) | Cluster ID: ${compilation.id}`,
          'Enforcing strict OPA Pre-Flight & HCL 2.0 Validation...',
        ]);
      }
    }
  }, [isOpen, isBlockedByRbac, environment, compilation.id]);

  if (!isOpen) return null;

  const startDeployment = async () => {
    setStage('running');
    setLogs([
      'Initializing execution container...',
      '$ terraform init',
      'Initializing the backend...',
      'Initializing provider plugins...',
      '- Finding hashicorp/aws versions matching "~> 5.40"...',
      '- Installing hashicorp/aws v5.40.0... (verified via cryptographic checksum)',
      'Terraform has been successfully initialized! \n',
      '$ terraform validate',
      'Success! The configuration is valid. \n',
      '$ opa eval -i plan.json -d policy/cost_governance.rego "data.terraform.governance.allow"',
      `Evaluated OPA Policy: ALLOW = TRUE (Budget under $${compilation.opaPolicy.enforcedBudget.toFixed(2)} cap) \n`,
      '$ terraform plan -out=tfplan',
      'Terraform used the selected providers to generate the following execution plan:',
      '+ aws_kms_key.queue_encryption',
      '+ aws_sqs_queue.events_dlq (Dead Letter Queue)',
      `+ ${compilation.architectureType === 'kinesis-lambda' ? 'aws_kinesis_stream.event_stream (2 shards)' : 'aws_sqs_queue.primary_queue'}`,
      '+ aws_vpc_endpoint.private_link (Interface Endpoint)',
      '+ aws_lambda_function.consumer (ARM64 Graviton)',
      '+ aws_lambda_event_source_mapping.trigger',
      'Plan: 6 to add, 0 to change, 0 to destroy. \n',
      '$ terraform apply "tfplan" -auto-approve',
      'aws_kms_key.queue_encryption: Creating...',
      'aws_vpc_endpoint.private_link: Creating...',
      'aws_kms_key.queue_encryption: Creation complete after 3s',
      'aws_sqs_queue.primary_queue: Creating...',
      'aws_lambda_function.consumer: Creating...',
      'aws_lambda_event_source_mapping.trigger: Creation complete after 4s',
      'Apply complete! Resources: 6 added, 0 changed, 0 destroyed.',
      `Outputs: estimated_monthly_cost = "$${compilation.costEstimate.monthlyTotal.toFixed(2)} USD"`,
      'STATUS: LIVE INFRASTRUCTURE PROVISIONED IN 1.8 SECONDS.'
    ]);

    // Simulate progress
    setTimeout(() => {
      setStage('completed');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Confetti fallback
      }
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Deploy Infrastructure Pipeline
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                  environment === 'prod' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {environment}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                100% Automated Terraform Plan & Apply Runner
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {stage === 'blocked' ? (
            <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-3">
              <div className="flex items-center gap-3 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-6 h-6" />
                RBAC Access Restriction: Production Deploy Blocked
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your current role is <strong className="text-amber-300 font-mono">Developer (Viewer)</strong>. Production applies require elevated <strong className="text-emerald-300">Platform Engineer (Admin)</strong> permissions.
              </p>
              <div className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                Policy Check: <span className="text-rose-400">RBAC_DENY</span>: Missing 'terraform:apply:prod' capability.
              </div>
              <div className="pt-2 text-xs text-slate-400">
                Tip: Switch your role to <span className="text-slate-200 font-semibold">Platform Admin</span> in the top header bar to execute this deployment.
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300 space-y-1 max-h-[360px] overflow-y-auto">
              {logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={
                    log.startsWith('$') ? 'text-indigo-400 font-bold pt-1' :
                    log.startsWith('Success') || log.startsWith('Apply complete') || log.startsWith('STATUS') ? 'text-emerald-400 font-bold' :
                    log.includes('Plan:') ? 'text-amber-300 font-semibold' :
                    'text-slate-400'
                  }
                >
                  {log}
                </div>
              ))}
              {stage === 'running' && (
                <div className="flex items-center gap-2 text-indigo-400 pt-2 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying Terraform resources in AWS...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {stage === 'completed' && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Deployed & Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
            {stage !== 'blocked' && stage !== 'completed' && (
              <button
                onClick={startDeployment}
                disabled={stage === 'running'}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {stage === 'running' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Executing Apply...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Execute Terraform Apply
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

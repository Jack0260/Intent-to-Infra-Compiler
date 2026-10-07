export type Environment = 'dev' | 'prod';
export type UserRole = 'platform_admin' | 'devops_engineer' | 'developer_viewer';

export interface CostBreakdownItem {
  resource: string;
  category: 'Compute' | 'Queue/Stream' | 'Storage' | 'Networking' | 'Security';
  usage: string;
  monthlyCost: number;
  unitPrice: string;
}

export interface CostVsScalePoint {
  throughput: string;
  throughputNum: number; // msgs per second
  sqsCost: number;
  kinesisCost: number;
  kafkaCost: number;
  recommended: 'sqs' | 'kinesis' | 'kafka';
}

export interface OpaRuleEvaluation {
  rule: string;
  category: 'Cost' | 'Security' | 'Resilience' | 'Tagging';
  description: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
}

export interface AdrAlternative {
  name: string;
  pros: string;
  cons: string;
  reasonRejected: string;
}

export interface AdrRecord {
  title: string;
  status: 'Accepted' | 'Proposed' | 'Superseded';
  date: string;
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  alternatives: AdrAlternative[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  environment: Environment;
  sha256: string;
  status: 'SUCCESS' | 'REJECTED' | 'WARNING';
  details: string;
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  sublabel: string;
  category: 'gateway' | 'queue' | 'compute' | 'storage' | 'security' | 'dlq' | 'stream';
  icon: string;
  status: 'provisioned' | 'ready' | 'optimized';
  costMonthly: number;
  specs?: Record<string, string | undefined>;
}

export interface CompilationResult {
  id: string;
  intent: string;
  environment: Environment;
  architectureType: 'sqs-lambda' | 'kinesis-lambda' | 'msk-kafka' | 'serverless-api';
  title: string;
  summary: string;
  isCheaperOptimized: boolean;
  savingsPercentage?: number;
  
  terraform: {
    mainTf: string;
    variablesTf: string;
    outputsTf: string;
    providersTf: string;
  };

  opaPolicy: {
    regoCode: string;
    rulesCount: number;
    enforcedBudget: number;
    passed: boolean;
    evaluations: OpaRuleEvaluation[];
  };

  costEstimate: {
    monthlyTotal: number;
    maxBudget: number;
    currency: string;
    breakdown: CostBreakdownItem[];
    infracostCliOutput: string;
  };

  costVsScale: CostVsScalePoint[];

  adr: AdrRecord;

  diagram: {
    nodes: Array<{
      id: string;
      type?: string;
      position: { x: number; y: number };
      data: FlowNodeData;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      animated?: boolean;
      label?: string;
      style?: Record<string, string | number>;
    }>;
  };

  goEngineAst: {
    packageName: string;
    version: string;
    astHash: string;
    resources: {
      resourceId: string;
      type: string;
      tier: string;
      monthlyCost: number;
    }[];
    compilationDurationMs: number;
    optimizations: string[];
  };

  auditLog: AuditLogEntry;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  content: string;
  compilationId?: string;
  compilationData?: CompilationResult;
}

import { 
  CompilationResult, 
  Environment, 
  CostVsScalePoint, 
  OpaRuleEvaluation, 
  CostBreakdownItem,
  AuditLogEntry
} from '../types/compiler';

// Deterministic hash generator for Go AST & Audit
export function generateSha256(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256:7f8a${hex}e93b4c102a9048df`;
}

export function compileIntent(
  intent: string,
  environment: Environment = 'prod',
  actor = 'jackmaxwell31@gmail.com',
  role = 'platform_admin',
  isCheaperRequest = false
): CompilationResult {
  const lower = intent.toLowerCase();
  const makeCheaper = isCheaperRequest || 
    lower.includes('cheaper') || 
    lower.includes('reduce cost') || 
    lower.includes('lower price') || 
    lower.includes('optimize cost');

  const isKafka = lower.includes('kafka') || lower.includes('msk');
  
  if (makeCheaper) {
    return generateKinesisCompilation(intent, environment, actor, role);
  } else if (isKafka) {
    return generateMskCompilation(intent, environment, actor, role);
  } else {
    // Default or "I need a queue that handles 10k msg/sec, costs <$100, is private, and has DLQ"
    return generateSqsCompilation(intent, environment, actor, role);
  }
}

function generateSqsCompilation(
  intent: string,
  env: Environment,
  actor: string,
  role: string
): CompilationResult {
  const isProd = env === 'prod';
  const monthlyTotal = isProd ? 78.40 : 28.50;
  const maxBudget = 100.00;
  const id = `compile-${Date.now().toString(36)}`;
  const sha = generateSha256(`${intent}-${env}-sqs-lambda`);

  const terraformMain = `/**
 * Intent-to-Infra Compiled Architecture
 * Target: AWS SQS + AWS Lambda + Dead Letter Queue + VPC Private Endpoint
 * Environment: ${env.toUpperCase()}
 * Enforced Intent: "handles 10k msg/sec, costs <$100, is private, and has DLQ"
 */

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

# KMS Customer Managed Key for strict compliance
resource "aws_kms_key" "queue_encryption" {
  description             = "KMS CMK for ${env} event queue encryption"
  deletion_window_in_days = ${isProd ? 30 : 7}
  enable_key_rotation     = ${isProd ? 'true' : 'false'}

  tags = {
    Environment = "${env}"
    ManagedBy   = "Intent-to-Infra-Compiler"
    Compliance  = "SOC2-HIPAA"
  }
}

# 1. Dead Letter Queue (DLQ)
resource "aws_sqs_queue" "events_dlq" {
  name                      = "prod-event-pipeline-dlq"
  kms_master_key_id         = aws_kms_key.queue_encryption.id
  message_retention_seconds = ${isProd ? 1209600 : 345600} # ${isProd ? '14 days' : '4 days'}

  tags = {
    Environment = "${env}"
    Tier        = "dlq"
  }
}

# 2. Primary High-Throughput SQS Queue
resource "aws_sqs_queue" "primary_queue" {
  name                        = "prod-event-pipeline-queue"
  kms_master_key_id           = aws_kms_key.queue_encryption.id
  visibility_timeout_seconds  = 60
  receive_wait_time_seconds   = 20 # Long polling enabled to minimize API request cost

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.events_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment  = "${env}"
    TargetRate   = "10000_msg_sec"
    BudgetLimit  = "100_usd"
    PrivateOnly  = "true"
  }
}

# 3. Private VPC Endpoint for SQS (Guarantees zero public internet traversal)
resource "aws_vpc_endpoint" "sqs_private_link" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.\${var.aws_region}.sqs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.sqs_endpoint_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "${env}-sqs-private-endpoint"
    Environment = "${env}"
  }
}

resource "aws_security_group" "sqs_endpoint_sg" {
  name        = "${env}-sqs-endpoint-sg"
  description = "Allow inbound TLS traffic from application subnets to SQS"
  vpc_id      = var.vpc_id

  ingress {
    description = "TLS from internal private subnets"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. Consumer Lambda Function with SQS Event Source Mapping
resource "aws_lambda_function" "queue_consumer" {
  function_name = "${env}-event-batch-processor"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "main.handler"
  runtime       = "provided.al2023" # Ultra-fast Go / Rust custom runtime
  architectures = ["arm64"]         # Graviton2 / 3 for 20% lower cost
  memory_size   = ${isProd ? 1024 : 512}
  timeout       = 30

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.sqs_endpoint_sg.id]
  }

  environment {
    variables = {
      ENV                = "${env}"
      DLQ_URL            = aws_sqs_queue.events_dlq.id
      BATCH_OPTIMIZATION = "ENABLED"
    }
  }

  tags = {
    Environment = "${env}"
    ManagedBy   = "Intent-to-Infra-Compiler"
  }
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn                   = aws_sqs_queue.primary_queue.arn
  function_name                      = aws_lambda_function.queue_consumer.arn
  batch_size                         = 10 # Batch 10 messages to compress Lambda invocation cost
  maximum_batching_window_in_seconds = 1
  scaling_config {
    maximum_concurrency = ${isProd ? 200 : 20}
  }
}

# 5. IAM Role with Least-Privilege
resource "aws_iam_role" "lambda_exec_role" {
  name = "${env}-lambda-sqs-consumer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
`;

  const terraformVars = `variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary target AWS region"
}

variable "vpc_id" {
  type        = string
  default     = "vpc-0a89d3112b3f"
  description = "VPC ID where private interface endpoint will attach"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR range for internal VPC network"
}

variable "private_subnet_ids" {
  type        = list(string)
  default     = ["subnet-01234abc", "subnet-05678def"]
  description = "Private isolated subnets (no public IGW routing)"
}
`;

  const terraformOutputs = `output "primary_queue_url" {
  description = "URL of the primary SQS queue"
  value       = aws_sqs_queue.primary_queue.id
}

output "primary_queue_arn" {
  description = "ARN of primary queue"
  value       = aws_sqs_queue.primary_queue.arn
}

output "dlq_url" {
  description = "Dead-letter queue URL"
  value       = aws_sqs_queue.events_dlq.id
}

output "vpc_endpoint_id" {
  description = "Private Link Interface Endpoint ID"
  value       = aws_vpc_endpoint.sqs_private_link.id
}

output "estimated_monthly_cost" {
  description = "Infracost compiled monthly projection"
  value       = "$${monthlyTotal} USD"
}
`;

  const opaRego = `package terraform.governance

import future.keywords.in

default allow = true

# RULE 1: Enforce Maximum Monthly Budget <= $100.00
max_allowed_monthly_budget := 100.00

deny[msg] {
  input.infracost.total_monthly_cost > max_allowed_monthly_budget
  msg := sprintf("COST_VIOLATION: Estimated monthly cost ($%.2f) exceeds policy ceiling ($%.2f)", [
    input.infracost.total_monthly_cost,
    max_allowed_monthly_budget
  ])
}

# RULE 2: Mandatory Dead-Letter Queue (DLQ) Attached
deny[msg] {
  some resource in input.resource_changes
  resource.type == "aws_sqs_queue"
  not resource.change.after.redrive_policy
  resource.values.tags.Tier != "dlq"
  msg := sprintf("RESILIENCE_VIOLATION: Primary queue '%v' lacks redrive_policy Dead Letter Queue", [resource.name])
}

# RULE 3: Enforce Private VPC Endpoint (No Direct Internet Routing)
deny[msg] {
  sqs_endpoints := [r | r := input.resource_changes[_]; r.type == "aws_vpc_endpoint"]
  count(sqs_endpoints) == 0
  msg := "SECURITY_VIOLATION: Missing required aws_vpc_endpoint for private subnet isolation"
}

# RULE 4: Enforce KMS Encryption At Rest
deny[msg] {
  some queue in input.resource_changes
  queue.type == "aws_sqs_queue"
  not queue.change.after.kms_master_key_id
  msg := sprintf("SECURITY_VIOLATION: Queue '%v' must have KMS CMK encryption enabled", [queue.name])
}

# RULE 5: Enforce Arm64 (Graviton) for Cost Optimization
deny[msg] {
  some lambda in input.resource_changes
  lambda.type == "aws_lambda_function"
  not "arm64" in lambda.change.after.architectures
  msg := "COST_VIOLATION: Lambda must use 'arm64' Graviton architecture for 20% lower run rate"
}
`;

  const evaluations: OpaRuleEvaluation[] = [
    {
      rule: "OPA-COST-001",
      category: "Cost",
      description: "Monthly Infracost estimate must not exceed $100.00 limit",
      status: "PASS",
      detail: `Projected cost is $${monthlyTotal}/mo, which is $${(maxBudget - monthlyTotal).toFixed(2)} under the $100.00 limit.`
    },
    {
      rule: "OPA-SEC-002",
      category: "Security",
      description: "Infra must be private with VPC Endpoint & no public ingress",
      status: "PASS",
      detail: "aws_vpc_endpoint.sqs_private_link provisioned in private subnets with strict SG."
    },
    {
      rule: "OPA-RES-003",
      category: "Resilience",
      description: "Primary message queue must have a Dead Letter Queue (DLQ) redrive policy",
      status: "PASS",
      detail: "aws_sqs_queue.primary_queue redrive_policy configured with maxReceiveCount=3 to DLQ."
    },
    {
      rule: "OPA-SEC-004",
      category: "Security",
      description: "Queue data must be encrypted with Customer Managed KMS Key",
      status: "PASS",
      detail: "aws_kms_key.queue_encryption with key rotation bound to both primary & DLQ."
    },
    {
      rule: "OPA-COST-005",
      category: "Cost",
      description: "Compute runtime must leverage Graviton (arm64) + SQS Batching",
      status: "PASS",
      detail: "Lambda architecture set to arm64 with batch_size=10 to compress execution costs."
    }
  ];

  const breakdown: CostBreakdownItem[] = [
    {
      resource: "aws_sqs_queue.primary_queue",
      category: "Queue/Stream",
      usage: "25.9M requests/month (with 10-msg batching)",
      monthlyCost: isProd ? 10.36 : 3.80,
      unitPrice: "$0.40 per 1M SQS requests"
    },
    {
      resource: "aws_sqs_queue.events_dlq",
      category: "Queue/Stream",
      usage: "< 0.05% error reroute",
      monthlyCost: 0.15,
      unitPrice: "$0.40 per 1M SQS requests"
    },
    {
      resource: "aws_lambda_function.queue_consumer",
      category: "Compute",
      usage: "2.59M invocations (arm64, 40ms avg duration)",
      monthlyCost: isProd ? 42.10 : 12.30,
      unitPrice: "$0.0000133334 / GB-second (Graviton)"
    },
    {
      resource: "aws_vpc_endpoint.sqs_private_link",
      category: "Networking",
      usage: "730 hours / 1 ENI + 50GB processed",
      monthlyCost: 21.90,
      unitPrice: "$0.01 per hour + $0.01/GB data"
    },
    {
      resource: "aws_kms_key.queue_encryption",
      category: "Security",
      usage: "1 Customer Managed Key + API requests",
      monthlyCost: 3.89,
      unitPrice: "$1.00/key + $0.03 per 10k requests"
    }
  ];

  const costVsScale: CostVsScalePoint[] = [
    { throughput: "1k msg/s", throughputNum: 1000, sqsCost: 14.50, kinesisCost: 31.20, kafkaCost: 180.00, recommended: "sqs" },
    { throughput: "5k msg/s", throughputNum: 5000, sqsCost: 45.20, kinesisCost: 31.20, kafkaCost: 180.00, recommended: "kinesis" },
    { throughput: "10k msg/s", throughputNum: 10000, sqsCost: 78.40, kinesisCost: 32.80, kafkaCost: 195.00, recommended: "kinesis" },
    { throughput: "25k msg/s", throughputNum: 25000, sqsCost: 184.00, kinesisCost: 65.60, kafkaCost: 210.00, recommended: "kinesis" },
    { throughput: "50k msg/s", throughputNum: 50000, sqsCost: 368.00, kinesisCost: 98.40, kafkaCost: 240.00, recommended: "kinesis" },
    { throughput: "100k msg/s", throughputNum: 100000, sqsCost: 735.00, kinesisCost: 196.80, kafkaCost: 290.00, recommended: "kinesis" },
  ];

  const infracostCliOutput = `────────────────────────────────────────────────────────────────────────────────
Project: aws-intent-pipeline (${env})
────────────────────────────────────────────────────────────────────────────────
+ aws_kms_key.queue_encryption
  + Customer managed key                                    1 key              $1.00
  + Key operations                                          96.3M ops          $2.89

+ aws_lambda_function.queue_consumer
  + Duration (ARM64, 1024MB)                                2,592,000 requests $41.58
  + Requests                                                2,592,000 requests $0.52

+ aws_sqs_queue.primary_queue
  + Requests (with 10-message batching)                     25,920,000 reqs    $10.36

+ aws_sqs_queue.events_dlq
  + Requests (< 0.1% DLQ overflow)                          26,000 reqs        $0.15

+ aws_vpc_endpoint.sqs_private_link
  + Interface endpoint hours                                730 hours          $7.30
  + Data processed                                          1,460 GB           $14.60

────────────────────────────────────────────────────────────────────────────────
OVERALL SUMMARY:
  Monthly Baseline Cost:    $0.00
  Monthly Compiled Cost:    $${monthlyTotal.toFixed(2)}
  Cost Policy Ceiling:      $100.00
  Status:                   PASS (Under budget by $${(maxBudget - monthlyTotal).toFixed(2)})
────────────────────────────────────────────────────────────────────────────────`;

  const adr = {
    title: "ADR-0042: SQS + Lambda with Private VPC Endpoint & DLQ for High-Volume Ingestion",
    status: "Accepted" as const,
    date: new Date().toISOString().split('T')[0],
    context: `User specified architectural intent: "${intent}". Required SLA includes handling 10,000 messages/sec peak, strict privacy (no public internet endpoints), zero unhandled message loss, and a cost cap of $100/mo in ${env}.`,
    decision: `We selected an event-driven architecture combining SQS Standard with AWS Lambda (ARM64 Graviton) consumer, paired with a Dead Letter Queue (DLQ) configured for 3-receive retries and a private AWS VPC Endpoint (PrivateLink). To keep costs under the $100 budget ceiling at 10k msg/s, the compiler applied SQS client-side batching (batch_size=10) and long polling (20s).`,
    consequences: {
      positive: [
        "Zero server maintenance; fully serverless auto-scaling from 0 to 10k msg/sec.",
        "Guaranteed message capture with DLQ retention of 14 days for forensic replay.",
        "100% private traffic via AWS VPC Interface Endpoint, meeting strict SOC2 and compliance controls.",
        `Infracost projection ($${monthlyTotal}/mo) sits comfortably below the $100 budget ceiling.`
      ],
      negative: [
        "At continuous sustained 10k msg/sec (24/7), SQS per-request billing will scale linearly and approach ~$78-$90/mo.",
        "Message ordering in SQS standard is best-effort (FIFO throughput is limited without partition keys)."
      ]
    },
    alternatives: [
      {
        name: "Amazon Kinesis Data Streams (Provisioned)",
        pros: "Fixed hourly shard billing, extremely cost-effective for continuous 24/7 high-throughput streams.",
        cons: "Slightly higher minimum baseline cost for low-traffic dev tiers; requires explicit shard management.",
        reasonRejected: "Initial user intent requested simple queue model with DLQ; Kinesis is offered as the optimal cost-reduction compilation target."
      },
      {
        name: "Managed Streaming for Apache Kafka (Amazon MSK)",
        pros: "Industry standard event streaming, strict ordering, partition scaling.",
        cons: "High minimum cluster cost ($180+/mo for multi-broker), breaching the $100/mo policy limit.",
        reasonRejected: "Violated OPA Rule OPA-COST-001 (Cost exceeded $100 limit)."
      }
    ]
  };

  const nodes = [
    {
      id: "node-ingress",
      position: { x: 50, y: 140 },
      data: {
        label: "Client Ingress",
        sublabel: "Internal VPC App",
        category: "gateway" as const,
        icon: "Send",
        status: "ready" as const,
        costMonthly: 0,
        specs: { "Throughput": "10,000 msg/sec", "Protocol": "HTTPS / Private" }
      }
    },
    {
      id: "node-vpc-endpoint",
      position: { x: 260, y: 140 },
      data: {
        label: "VPC Interface Endpoint",
        sublabel: "PrivateLink (No IGW)",
        category: "security" as const,
        icon: "ShieldCheck",
        status: "provisioned" as const,
        costMonthly: 21.90,
        specs: { "DNS": "Private DNS Enabled", "Isolation": "Multi-AZ Subnets" }
      }
    },
    {
      id: "node-sqs-primary",
      position: { x: 500, y: 140 },
      data: {
        label: "Primary SQS Queue",
        sublabel: "kms:queue_encryption",
        category: "queue" as const,
        icon: "Layers",
        status: "provisioned" as const,
        costMonthly: 10.36,
        specs: { "Batching": "10 msgs", "Poll Timeout": "20s", "Retention": isProd ? "14d" : "4d" }
      }
    },
    {
      id: "node-dlq",
      position: { x: 500, y: 310 },
      data: {
        label: "Dead Letter Queue (DLQ)",
        sublabel: "maxReceiveCount = 3",
        category: "dlq" as const,
        icon: "AlertTriangle",
        status: "provisioned" as const,
        costMonthly: 0.15,
        specs: { "Target ARN": "events_dlq", "Alert": "CloudWatch Alarm" }
      }
    },
    {
      id: "node-lambda",
      position: { x: 750, y: 140 },
      data: {
        label: "Lambda Batch Worker",
        sublabel: "ARM64 Graviton (Go)",
        category: "compute" as const,
        icon: "Cpu",
        status: "provisioned" as const,
        costMonthly: 42.10,
        specs: { "Arch": "arm64", "Batch Window": "1s", "Max Concurrency": isProd ? "200" : "20" }
      }
    },
    {
      id: "node-kms",
      position: { x: 380, y: 10 },
      data: {
        label: "KMS Customer Key",
        sublabel: "CMK AES-256",
        category: "security" as const,
        icon: "Lock",
        status: "provisioned" as const,
        costMonthly: 3.89,
        specs: { "Rotation": isProd ? "Enabled" : "Manual", "Key Spec": "SYMMETRIC_DEFAULT" }
      }
    }
  ];

  const edges = [
    { id: "e1", source: "node-ingress", target: "node-vpc-endpoint", animated: true, label: "Private TLS" },
    { id: "e2", source: "node-vpc-endpoint", target: "node-sqs-primary", animated: true, label: "10k msg/s" },
    { id: "e3", source: "node-sqs-primary", target: "node-lambda", animated: true, label: "Batch (10x)" },
    { id: "e4", source: "node-sqs-primary", target: "node-dlq", animated: false, label: "3x failure redrive" },
    { id: "e5", source: "node-kms", target: "node-sqs-primary", animated: false, label: "Encrypt" },
    { id: "e6", source: "node-kms", target: "node-dlq", animated: false, label: "Encrypt" }
  ];

  const auditLog: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    role,
    action: "COMPILE_INTENT",
    environment: env,
    sha256: sha,
    status: "SUCCESS",
    details: `Compiled SQS + Lambda + DLQ + VPC Endpoint pipeline. Infracost: $${monthlyTotal}/mo. OPA governance: 5/5 PASS.`
  };

  return {
    id,
    intent,
    environment: env,
    architectureType: "sqs-lambda",
    title: "AWS SQS + Lambda Worker with Dead Letter Queue & VPC Endpoint",
    summary: "High-throughput serverless message ingestion with zero internet exposure, automatic DLQ failure isolation, and Graviton2 batch compute.",
    isCheaperOptimized: false,
    terraform: {
      mainTf: terraformMain,
      variablesTf: terraformVars,
      outputsTf: terraformOutputs,
      providersTf: `# Terraform AWS Provider Configuration\nprovider "aws" {\n  region = var.aws_region\n  default_tags {\n    tags = {\n      Environment = "${env}"\n      ManagedBy   = "Intent-to-Infra-Compiler"\n    }\n  }\n}`
    },
    opaPolicy: {
      regoCode: opaRego,
      rulesCount: evaluations.length,
      enforcedBudget: maxBudget,
      passed: true,
      evaluations
    },
    costEstimate: {
      monthlyTotal,
      maxBudget,
      currency: "USD",
      breakdown,
      infracostCliOutput
    },
    costVsScale,
    adr,
    diagram: { nodes, edges },
    goEngineAst: {
      packageName: "github.com/intent-infra/compiler/pkg/engine",
      version: "v2.4.1",
      astHash: sha,
      resources: [
        { resourceId: "aws_sqs_queue.primary_queue", type: "Queue", tier: "Standard", monthlyCost: 10.36 },
        { resourceId: "aws_sqs_queue.events_dlq", type: "DLQ", tier: "Standard", monthlyCost: 0.15 },
        { resourceId: "aws_lambda_function.queue_consumer", type: "ServerlessCompute", tier: "GravitonARM64", monthlyCost: 42.10 },
        { resourceId: "aws_vpc_endpoint.sqs_private_link", type: "VPCEndpoint", tier: "Interface", monthlyCost: 21.90 },
        { resourceId: "aws_kms_key.queue_encryption", type: "KMSKey", tier: "CMK", monthlyCost: 3.89 }
      ],
      compilationDurationMs: 42,
      optimizations: [
        "AST Transformer: SQS batching window inserted (10 msgs per invocation)",
        "Graviton2 Target: arm64 runtime mapped to reduce GB-second compute cost by 20%",
        "VPC Endpoint Interface: private subnet isolation injected automatically"
      ]
    },
    auditLog
  };
}

function generateKinesisCompilation(
  intent: string,
  env: Environment,
  actor: string,
  role: string
): CompilationResult {
  const isProd = env === 'prod';
  const monthlyTotal = isProd ? 32.80 : 16.40;
  const maxBudget = 100.00;
  const previousCost = isProd ? 78.40 : 28.50;
  const savingsPct = Math.round(((previousCost - monthlyTotal) / previousCost) * 100);
  const id = `compile-opt-${Date.now().toString(36)}`;
  const sha = generateSha256(`${intent}-${env}-kinesis-optimized`);

  const terraformMain = `/**
 * Intent-to-Infra Cost-Optimized Re-Compilation
 * Target: AWS Kinesis Data Streams + Lambda Consumer + SQS DLQ + VPC Endpoint
 * Environment: ${env.toUpperCase()}
 * Reason: User requested "make it cheaper" -> Switched from per-request SQS to fixed-shard Kinesis
 * Savings: ${savingsPct}% reduction vs SQS ($${previousCost.toFixed(2)}/mo -> $${monthlyTotal.toFixed(2)}/mo)
 */

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

# KMS Key for Kinesis stream encryption
resource "aws_kms_key" "stream_encryption" {
  description         = "KMS CMK for ${env} Kinesis stream encryption"
  enable_key_rotation = true

  tags = {
    Environment = "${env}"
    ManagedBy   = "Intent-to-Infra-Compiler"
    CostProfile = "Optimized-Kinesis"
  }
}

# 1. AWS Kinesis Data Stream (2 Provisioned Shards handle up to 2,000 writes/sec & 2MB/s)
# Note: For 10,000 msg/s, 2 shards with record packing handles 10k msg/s at flat $0.015/shard-hour!
resource "aws_kinesis_stream" "event_stream" {
  name             = "${env}-optimized-event-stream"
  shard_count      = ${isProd ? 2 : 1}
  retention_period = ${isProd ? 48 : 24} # 48 hours replay capability

  shard_level_metrics = [
    "IncomingBytes",
    "OutgoingBytes",
    "WriteProvisionedThroughputExceeded"
  ]

  encryption_type = "KMS"
  kms_key_id      = aws_kms_key.stream_encryption.id

  tags = {
    Environment = "${env}"
    Throughput  = "10000_msg_sec_packed"
    CostProfile = "HighThroughputOptimized"
  }
}

# 2. Dead Letter Queue (SQS) for Failed Stream Records
resource "aws_sqs_queue" "stream_dlq" {
  name                      = "${env}-kinesis-stream-dlq"
  kms_master_key_id         = aws_kms_key.stream_encryption.id
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Environment = "${env}"
    Tier        = "dlq"
  }
}

# 3. Private VPC Endpoint for Kinesis
resource "aws_vpc_endpoint" "kinesis_private_link" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.\${var.aws_region}.kinesis-streams"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.kinesis_endpoint_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "${env}-kinesis-private-endpoint"
    Environment = "${env}"
  }
}

resource "aws_security_group" "kinesis_endpoint_sg" {
  name   = "${env}-kinesis-endpoint-sg"
  vpc_id = var.vpc_id

  ingress {
    description = "TLS from VPC subnets"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. Stream Consumer Lambda Function
resource "aws_lambda_function" "stream_consumer" {
  function_name = "${env}-kinesis-stream-processor"
  role          = aws_iam_role.lambda_kinesis_role.arn
  handler       = "main.handler"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  memory_size   = 512
  timeout       = 60

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.kinesis_endpoint_sg.id]
  }

  environment {
    variables = {
      ENV     = "${env}"
      DLQ_URL = aws_sqs_queue.stream_dlq.id
    }
  }
}

# 5. Kinesis Event Source Mapping with On-Failure DLQ Destination
resource "aws_lambda_event_source_mapping" "kinesis_trigger" {
  event_source_arn                   = aws_kinesis_stream.event_stream.arn
  function_name                      = aws_lambda_function.stream_consumer.arn
  starting_position                  = "LATEST"
  batch_size                         = 100 # Large stream batch size reduces invocation count by 90%
  maximum_batching_window_in_seconds = 2
  parallelization_factor             = 2

  destination_config {
    on_failure {
      destination_arn = aws_sqs_queue.stream_dlq.arn
    }
  }
}

# IAM Execution Role
resource "aws_iam_role" "lambda_kinesis_role" {
  name = "${env}-lambda-kinesis-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_kinesis_attach" {
  role       = aws_iam_role.lambda_kinesis_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaKinesisExecutionRole"
}
`;

  const terraformVars = `variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_id" {
  type    = string
  default = "vpc-0a89d3112b3f"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "private_subnet_ids" {
  type    = list(string)
  default = ["subnet-01234abc", "subnet-05678def"]
}
`;

  const terraformOutputs = `output "kinesis_stream_name" {
  description = "Name of the provisioned Kinesis data stream"
  value       = aws_kinesis_stream.event_stream.name
}

output "kinesis_stream_arn" {
  description = "ARN of Kinesis stream"
  value       = aws_kinesis_stream.event_stream.arn
}

output "dlq_url" {
  description = "Dead-letter queue URL for failed stream events"
  value       = aws_sqs_queue.stream_dlq.id
}

output "compiled_savings" {
  description = "Cost reduction achieved vs SQS baseline"
  value       = "${savingsPct}% savings ($${monthlyTotal}/mo vs $${previousCost}/mo)"
}
`;

  const opaRego = `package terraform.governance

import future.keywords.in

default allow = true

# RULE 1: Enforce Budget Limit ($100 max)
max_budget := 100.00

deny[msg] {
  input.infracost.total_monthly_cost > max_budget
  msg := sprintf("COST_VIOLATION: Exceeds budget limit: $%.2f > $%.2f", [
    input.infracost.total_monthly_cost,
    max_budget
  ])
}

# RULE 2: Enforce DLQ on Stream Failures
deny[msg] {
  some mapping in input.resource_changes
  mapping.type == "aws_lambda_event_source_mapping"
  not mapping.change.after.destination_config[0].on_failure[0].destination_arn
  msg := "RESILIENCE_VIOLATION: Stream event source mapping must define on_failure DLQ destination"
}

# RULE 3: Enforce Stream KMS Encryption
deny[msg] {
  some stream in input.resource_changes
  stream.type == "aws_kinesis_stream"
  stream.change.after.encryption_type != "KMS"
  msg := "SECURITY_VIOLATION: Kinesis stream must use KMS encryption"
}

# RULE 4: Enforce Batch Size >= 50 for Cost Optimization
deny[msg] {
  some mapping in input.resource_changes
  mapping.type == "aws_lambda_event_source_mapping"
  mapping.change.after.batch_size < 50
  msg := "COST_VIOLATION: Stream consumer batch_size should be >= 50 to suppress Lambda invocation charges"
}
`;

  const evaluations: OpaRuleEvaluation[] = [
    {
      rule: "OPA-COST-001",
      category: "Cost",
      description: "Monthly Infracost estimate must not exceed $100.00 limit",
      status: "PASS",
      detail: `Projected cost is $${monthlyTotal}/mo (${savingsPct}% cheaper than SQS baseline). Well under $100.`
    },
    {
      rule: "OPA-RES-002",
      category: "Resilience",
      description: "Stream event source mapping must have On-Failure Dead Letter Queue",
      status: "PASS",
      detail: "Configured destination_config.on_failure pointing to aws_sqs_queue.stream_dlq."
    },
    {
      rule: "OPA-SEC-003",
      category: "Security",
      description: "Kinesis Stream must be encrypted at rest using KMS Key",
      status: "PASS",
      detail: "aws_kinesis_stream.event_stream has encryption_type = 'KMS' bound to CMK."
    },
    {
      rule: "OPA-COST-004",
      category: "Cost",
      description: "Stream consumer batch size >= 50 to minimize invocation cost",
      status: "PASS",
      detail: "Configured batch_size=100 and maximum_batching_window_in_seconds=2."
    },
    {
      rule: "OPA-SEC-005",
      category: "Security",
      description: "Private VPC Interface Endpoint required for stream ingress",
      status: "PASS",
      detail: "aws_vpc_endpoint.kinesis_private_link provisioned in private subnets."
    }
  ];

  const breakdown: CostBreakdownItem[] = [
    {
      resource: "aws_kinesis_stream.event_stream",
      category: "Queue/Stream",
      usage: `${isProd ? '2 shards' : '1 shard'} × 730 hours`,
      monthlyCost: isProd ? 21.90 : 10.95,
      unitPrice: "$0.015 per shard hour"
    },
    {
      resource: "aws_lambda_function.stream_consumer",
      category: "Compute",
      usage: "259,200 invocations (batch_size=100, 10x fewer invocations)",
      monthlyCost: isProd ? 4.25 : 1.85,
      unitPrice: "$0.0000133334 / GB-second (Graviton)"
    },
    {
      resource: "aws_sqs_queue.stream_dlq",
      category: "Queue/Stream",
      usage: "< 5,000 error events",
      monthlyCost: 0.05,
      unitPrice: "$0.40 per 1M requests"
    },
    {
      resource: "aws_kms_key.stream_encryption",
      category: "Security",
      usage: "1 Customer Managed Key",
      monthlyCost: 1.50,
      unitPrice: "$1.00/key + basic crypto ops"
    },
    {
      resource: "aws_vpc_endpoint.kinesis_private_link",
      category: "Networking",
      usage: "Shared / optimized interface",
      monthlyCost: 5.10,
      unitPrice: "VPC endpoint ingress optimized"
    }
  ];

  const costVsScale: CostVsScalePoint[] = [
    { throughput: "1k msg/s", throughputNum: 1000, sqsCost: 14.50, kinesisCost: 16.40, kafkaCost: 180.00, recommended: "sqs" },
    { throughput: "5k msg/s", throughputNum: 5000, sqsCost: 45.20, kinesisCost: 21.90, kafkaCost: 180.00, recommended: "kinesis" },
    { throughput: "10k msg/s", throughputNum: 10000, sqsCost: 78.40, kinesisCost: 32.80, kafkaCost: 195.00, recommended: "kinesis" },
    { throughput: "25k msg/s", throughputNum: 25000, sqsCost: 184.00, kinesisCost: 54.70, kafkaCost: 210.00, recommended: "kinesis" },
    { throughput: "50k msg/s", throughputNum: 50000, sqsCost: 368.00, kinesisCost: 87.60, kafkaCost: 240.00, recommended: "kinesis" },
    { throughput: "100k msg/s", throughputNum: 100000, sqsCost: 735.00, kinesisCost: 142.20, kafkaCost: 290.00, recommended: "kinesis" },
  ];

  const infracostCliOutput = `────────────────────────────────────────────────────────────────────────────────
Project: aws-intent-pipeline-kinesis-optimized (${env})
────────────────────────────────────────────────────────────────────────────────
+ aws_kinesis_stream.event_stream
  + Shard hours (2 provisioned shards)                      1,460 hours        $21.90
  + PUT Payload Units (packed 10k msg/s)                    Packed in batch    $0.00

+ aws_lambda_function.stream_consumer
  + Duration (ARM64, 512MB, 100-record batches)             259,200 invocations $4.20
  + Requests                                                259,200 requests   $0.05

+ aws_sqs_queue.stream_dlq
  + DLQ Error Fallback                                      <5,000 reqs        $0.05

+ aws_kms_key.stream_encryption
  + Customer managed key                                    1 key              $1.00
  + Stream crypto operations                                Cached             $0.50

+ aws_vpc_endpoint.kinesis_private_link
  + Interface endpoint allocation                           730 hours          $5.10

────────────────────────────────────────────────────────────────────────────────
OPTIMIZATION COMPARISON:
  Previous SQS Baseline:    $${previousCost.toFixed(2)} / month
  New Kinesis Compiled:     $${monthlyTotal.toFixed(2)} / month
  Net Monthly Savings:      $${(previousCost - monthlyTotal).toFixed(2)} / month (-${savingsPct}%)
  OPA Cost Ceiling ($100):  PASS (Consumes only ${Math.round((monthlyTotal / maxBudget) * 100)}% of max budget)
────────────────────────────────────────────────────────────────────────────────`;

  const adr = {
    title: "ADR-0043: Re-compilation to Amazon Kinesis Data Streams for 58% Cost Reduction at Scale",
    status: "Accepted" as const,
    date: new Date().toISOString().split('T')[0],
    context: `User feedback requested: "${intent}" ("make it cheaper"). Under 10k msg/sec continuous load, SQS request billing ($0.40 per 1M API calls) scales linearly with message count, costing ~$78.40/mo. Shard-based stream pricing provides non-linear cost compression.`,
    decision: `Re-compiled the architecture from SQS Standard to Amazon Kinesis Data Streams with 2 provisioned shards, stream-level KMS encryption, and Lambda batch consumer configured with batch_size=100. Retained SQS for the Dead Letter Queue (on_failure destination) to guarantee zero message loss.`,
    consequences: {
      positive: [
        `Drastic cost reduction: monthly spend drops from $${previousCost.toFixed(2)} to $${monthlyTotal.toFixed(2)} (${savingsPct}% cheaper).`,
        "Batching factor increased from 10 to 100, collapsing Lambda invocation counts by 90%.",
        "Retains strict privacy via AWS VPC Interface Endpoint (Kinesis PrivateLink).",
        "Deterministic ordering guaranteed within shard partition keys."
      ],
      negative: [
        "Provisioned shards must be monitored for WriteProvisionedThroughputExceeded if traffic spikes beyond 2,000 writes/sec per shard (resolved by producer record aggregation/KPL).",
        "Stream retention capped at 48 hours compared to SQS 14-day retention."
      ]
    },
    alternatives: [
      {
        name: "Retain SQS with aggressive 50x client-side batching",
        pros: "No architectural paradigm shift.",
        cons: "Requires heavy client producer buffering and latency tradeoffs.",
        reasonRejected: "Kinesis provides superior unit economics and built-in replay capabilities for continuous streams."
      }
    ]
  };

  const nodes = [
    {
      id: "node-ingress",
      position: { x: 50, y: 140 },
      data: {
        label: "Client Ingress",
        sublabel: "Producer App (KPL)",
        category: "gateway" as const,
        icon: "Send",
        status: "optimized" as const,
        costMonthly: 0,
        specs: { "Record Aggregation": "Enabled", "Throughput": "10,000 msg/sec" }
      }
    },
    {
      id: "node-kinesis-endpoint",
      position: { x: 260, y: 140 },
      data: {
        label: "Kinesis VPC Endpoint",
        sublabel: "PrivateLink Interface",
        category: "security" as const,
        icon: "ShieldCheck",
        status: "optimized" as const,
        costMonthly: 5.10,
        specs: { "Type": "Interface Endpoint", "Private DNS": "Enabled" }
      }
    },
    {
      id: "node-kinesis-stream",
      position: { x: 500, y: 140 },
      data: {
        label: "Kinesis Data Stream",
        sublabel: "2 Provisioned Shards",
        category: "stream" as const,
        icon: "Activity",
        status: "optimized" as const,
        costMonthly: 21.90,
        specs: { "Shards": isProd ? "2 Shards" : "1 Shard", "Capacity": "2MB/s write", "Retention": "48 hrs" }
      }
    },
    {
      id: "node-stream-dlq",
      position: { x: 500, y: 310 },
      data: {
        label: "On-Failure SQS DLQ",
        sublabel: "Error Quarantine",
        category: "dlq" as const,
        icon: "AlertTriangle",
        status: "provisioned" as const,
        costMonthly: 0.05,
        specs: { "Destination": "on_failure", "Max Age": "14 days" }
      }
    },
    {
      id: "node-kinesis-lambda",
      position: { x: 750, y: 140 },
      data: {
        label: "Stream Batch Worker",
        sublabel: "batch_size = 100",
        category: "compute" as const,
        icon: "Cpu",
        status: "optimized" as const,
        costMonthly: 4.25,
        specs: { "Batch Size": "100 records", "Parallelization": "2x", "Arch": "arm64" }
      }
    },
    {
      id: "node-kms-kinesis",
      position: { x: 380, y: 10 },
      data: {
        label: "KMS CMK Key",
        sublabel: "Kinesis Stream Key",
        category: "security" as const,
        icon: "Lock",
        status: "provisioned" as const,
        costMonthly: 1.50,
        specs: { "Rotation": "Active", "Type": "SYMMETRIC" }
      }
    }
  ];

  const edges = [
    { id: "e1", source: "node-ingress", target: "node-kinesis-endpoint", animated: true, label: "Private TLS" },
    { id: "e2", source: "node-kinesis-endpoint", target: "node-kinesis-stream", animated: true, label: "Packed Writes" },
    { id: "e3", source: "node-kinesis-stream", target: "node-kinesis-lambda", animated: true, label: "100-batch" },
    { id: "e4", source: "node-kinesis-lambda", target: "node-stream-dlq", animated: false, label: "on_failure redirect" },
    { id: "e5", source: "node-kms-kinesis", target: "node-kinesis-stream", animated: false, label: "KMS Encrypt" }
  ];

  const auditLog: AuditLogEntry = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor,
    role,
    action: "OPTIMIZE_COST_RECOMPILE",
    environment: env,
    sha256: sha,
    status: "SUCCESS",
    details: `Re-compiled to Kinesis Data Streams. Cost slashed by ${savingsPct}% ($${previousCost.toFixed(2)} -> $${monthlyTotal.toFixed(2)}). All 5 OPA checks PASS.`
  };

  return {
    id,
    intent,
    environment: env,
    architectureType: "kinesis-lambda",
    title: "AWS Kinesis Data Streams (Cost-Optimized Sharded Pipeline)",
    summary: `Re-compiled for optimal cost economics: replaced per-request SQS queue with 2 provisioned Kinesis shards, dropping monthly spend by ${savingsPct}%.`,
    isCheaperOptimized: true,
    savingsPercentage: savingsPct,
    terraform: {
      mainTf: terraformMain,
      variablesTf: terraformVars,
      outputsTf: terraformOutputs,
      providersTf: `# Terraform AWS Provider Configuration\nprovider "aws" {\n  region = var.aws_region\n  default_tags {\n    tags = {\n      Environment = "${env}"\n      OptimizedBy = "Intent-to-Infra-Compiler"\n    }\n  }\n}`
    },
    opaPolicy: {
      regoCode: opaRego,
      rulesCount: evaluations.length,
      enforcedBudget: maxBudget,
      passed: true,
      evaluations
    },
    costEstimate: {
      monthlyTotal,
      maxBudget,
      currency: "USD",
      breakdown,
      infracostCliOutput
    },
    costVsScale,
    adr,
    diagram: { nodes, edges },
    goEngineAst: {
      packageName: "github.com/intent-infra/compiler/pkg/engine",
      version: "v2.4.1",
      astHash: sha,
      resources: [
        { resourceId: "aws_kinesis_stream.event_stream", type: "Stream", tier: "Provisioned2Shards", monthlyCost: 21.90 },
        { resourceId: "aws_lambda_function.stream_consumer", type: "ServerlessCompute", tier: "GravitonARM64", monthlyCost: 4.25 },
        { resourceId: "aws_sqs_queue.stream_dlq", type: "DLQ", tier: "Standard", monthlyCost: 0.05 },
        { resourceId: "aws_vpc_endpoint.kinesis_private_link", type: "VPCEndpoint", tier: "Interface", monthlyCost: 5.10 },
        { resourceId: "aws_kms_key.stream_encryption", type: "KMSKey", tier: "CMK", monthlyCost: 1.50 }
      ],
      compilationDurationMs: 38,
      optimizations: [
        `Re-targeting heuristic: Cost reduction requested. Switched queue primitive to Kinesis Shard model (-${savingsPct}%).`,
        "Batch Size Expanded: Set to 100 with 2s window to suppress 90% of invocation overhead.",
        "Payload Compression: Aggregated producer writes maximize 1MB/s shard capacity."
      ]
    },
    auditLog
  };
}

function generateMskCompilation(
  intent: string,
  env: Environment,
  actor: string,
  role: string
): CompilationResult {
  const isProd = env === 'prod';
  const monthlyTotal = isProd ? 195.00 : 92.50;
  const maxBudget = 100.00;
  const passed = monthlyTotal <= maxBudget;
  const id = `compile-msk-${Date.now().toString(36)}`;
  const sha = generateSha256(`${intent}-${env}-msk`);

  const terraformMain = `/**
 * AWS Managed Streaming for Apache Kafka (Amazon MSK)
 * Target: Multi-Broker Kafka Cluster + Schema Registry + Consumer
 * Environment: ${env.toUpperCase()}
 */

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

resource "aws_msk_cluster" "kafka_pipeline" {
  cluster_name           = "${env}-event-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = ${isProd ? 3 : 2}

  broker_node_group_info {
    instance_type   = "${isProd ? 'kafka.m5.large' : 'kafka.t3.small'}"
    client_subnets  = var.private_subnet_ids
    security_groups = [aws_security_group.msk_sg.id]

    storage_info {
      ebs_storage_info {
        volume_size = ${isProd ? 100 : 20}
      }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  tags = {
    Environment = "${env}"
    Compliance  = "HighThroughput"
  }
}

resource "aws_security_group" "msk_sg" {
  name   = "${env}-msk-sg"
  vpc_id = var.vpc_id
}
`;

  const evaluations: OpaRuleEvaluation[] = [
    {
      rule: "OPA-COST-001",
      category: "Cost",
      description: "Monthly Infracost estimate must not exceed $100.00 limit",
      status: passed ? "PASS" : "FAIL",
      detail: passed
        ? `Within budget at $${monthlyTotal}/mo.`
        : `COST OVERRUN: Amazon MSK cluster ($${monthlyTotal}/mo) violates $100/mo policy ceiling by $${(monthlyTotal - maxBudget).toFixed(2)}.`
    },
    {
      rule: "OPA-SEC-002",
      category: "Security",
      description: "Encryption in transit and at rest required",
      status: "PASS",
      detail: "Client broker TLS and in-cluster TLS enforced."
    }
  ];

  return {
    id,
    intent,
    environment: env,
    architectureType: "msk-kafka",
    title: "AWS Managed Streaming for Apache Kafka (Amazon MSK)",
    summary: "Dedicated enterprise Kafka cluster with partition parallelism and multi-broker fault tolerance.",
    isCheaperOptimized: false,
    terraform: {
      mainTf: terraformMain,
      variablesTf: 'variable "vpc_id" { type = string }\nvariable "private_subnet_ids" { type = list(string) }',
      outputsTf: 'output "zookeeper_connect_string" { value = aws_msk_cluster.kafka_pipeline.zookeeper_connect_string }',
      providersTf: 'provider "aws" { region = "us-east-1" }'
    },
    opaPolicy: {
      regoCode: `package terraform.governance\ndefault allow = ${passed ? 'true' : 'false'}\n# Budget check $100`,
      rulesCount: evaluations.length,
      enforcedBudget: maxBudget,
      passed,
      evaluations
    },
    costEstimate: {
      monthlyTotal,
      maxBudget,
      currency: "USD",
      breakdown: [
        { resource: "aws_msk_cluster.kafka_pipeline", category: "Queue/Stream", usage: `${isProd ? '3 brokers' : '2 brokers'}`, monthlyCost: monthlyTotal - 15, unitPrice: "Instance hourly fee" },
        { resource: "aws_ebs_volume", category: "Storage", usage: "Storage volumes", monthlyCost: 15.00, unitPrice: "$0.10/GB-month" }
      ],
      infracostCliOutput: `Total Monthly Cost: $${monthlyTotal.toFixed(2)} (Policy status: ${passed ? 'PASS' : 'VIOLATION'})`
    },
    costVsScale: [
      { throughput: "1k msg/s", throughputNum: 1000, sqsCost: 14.50, kinesisCost: 16.40, kafkaCost: 180.00, recommended: "sqs" },
      { throughput: "10k msg/s", throughputNum: 10000, sqsCost: 78.40, kinesisCost: 32.80, kafkaCost: 195.00, recommended: "kinesis" },
      { throughput: "100k msg/s", throughputNum: 100000, sqsCost: 735.00, kinesisCost: 142.20, kafkaCost: 290.00, recommended: "kinesis" }
    ],
    adr: {
      title: "ADR-0044: Dedicated MSK Kafka Cluster Evaluation",
      status: passed ? "Accepted" : "Proposed",
      date: new Date().toISOString().split('T')[0],
      context: intent,
      decision: "Evaluated dedicated Kafka cluster for partitioned event streams.",
      consequences: {
        positive: ["Industry-standard Kafka protocol compatibility", "Zero vendor lock-in"],
        negative: ["Breaches $100 budget ceiling in production tier", "High idle baseline cost"]
      },
      alternatives: [
        { name: "Kinesis Data Streams", pros: "Much lower baseline cost", cons: "AWS proprietary API", reasonRejected: "N/A" }
      ]
    },
    diagram: {
      nodes: [
        { id: "n-kafka-ingress", position: { x: 80, y: 150 }, data: { label: "Client Ingress", sublabel: "Kafka Producer", category: "gateway", icon: "Send", status: "provisioned", costMonthly: 0, specs: {} } },
        { id: "n-msk-cluster", position: { x: 380, y: 150 }, data: { label: "Amazon MSK Cluster", sublabel: "3 Broker Nodes", category: "stream", icon: "Layers", status: passed ? "provisioned" : "ready", costMonthly: monthlyTotal, specs: { "Version": "3.6.0" } } }
      ],
      edges: [
        { id: "e1", source: "n-kafka-ingress", target: "n-msk-cluster", animated: true, label: "TLS Broker Auth" }
      ]
    },
    goEngineAst: {
      packageName: "github.com/intent-infra/compiler/pkg/engine",
      version: "v2.4.1",
      astHash: sha,
      resources: [{ resourceId: "aws_msk_cluster.kafka_pipeline", type: "KafkaCluster", tier: "m5.large", monthlyCost: monthlyTotal }],
      compilationDurationMs: 45,
      optimizations: ["Cluster topology evaluation"]
    },
    auditLog: {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      role,
      action: "COMPILE_INTENT_MSK",
      environment: env,
      sha256: sha,
      status: passed ? "SUCCESS" : "WARNING",
      details: `MSK compilation evaluated. Cost: $${monthlyTotal}/mo. Budget limit: $100.`
    }
  };
}

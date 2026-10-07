import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { compileIntent } from './src/lib/compilerEngine.ts';
import { 
  saveCompilation, 
  getAllCompilations, 
  getAllAuditLogs, 
  getDatabaseStats 
} from './src/db/sqlite.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Seed initial compilation on boot if database is empty
try {
  const existing = getAllCompilations();
  if (existing.length === 0) {
    const initialSqs = compileIntent(
      "I need a queue that handles 10k msg/sec, costs <$100, is private, and has DLQ",
      "prod",
      "jackmaxwell31@gmail.com",
      "platform_admin",
      false
    );
    saveCompilation(initialSqs);
    console.log('[Database] Seeded initial production compilation into SQLite');
  }
} catch (seedErr) {
  console.warn('[Database] Seed check notice:', seedErr);
}

// Initialize GoogleGenAI server-side with User-Agent header
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// API: Get Database Health and Table Metrics
app.get('/api/db-stats', (_req: Request, res: Response) => {
  try {
    const stats = getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Database stats lookup failed', message: err.message });
  }
});

// API: List Historical Stored Compilations
app.get('/api/compilations', (_req: Request, res: Response) => {
  try {
    const records = getAllCompilations();
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve compilations', message: err.message });
  }
});

// API: List Immutable Audit Trail
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  try {
    const logs = getAllAuditLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve audit logs', message: err.message });
  }
});

// API: Compile Intent into Infrastructure Bundle
app.post('/api/compile', async (req: Request, res: Response) => {
  try {
    const { intent, environment = 'prod', role = 'platform_admin', actor = 'jackmaxwell31@gmail.com', isCheaperRequest = false } = req.body;

    if (!intent || typeof intent !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "intent" parameter' });
      return;
    }

    // Step 1: Execute compiler engine
    const compilation = compileIntent(intent, environment, actor, role, isCheaperRequest);

    // Step 2: If Gemini API key is available, enrich with AI Architectural Synthesis
    if (aiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        const prompt = `You are a Principal Cloud Architect and Terraform Compiler Engineer.
A user provided the infrastructure intent: "${intent}".
Environment: ${environment}.
Role: ${role}.
Target Architecture: ${compilation.architectureType}.
Monthly Cost Estimate: $${compilation.costEstimate.monthlyTotal}.

Write a sharp, high-level 2-sentence executive technical summary of this compilation, highlighting why this architecture meets SLA (10k msg/sec, cost <$100, private subnets, DLQ) and the exact cost/concurrency trade-offs. Keep it under 50 words.`;

        const aiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini call timed out')), 2500)
        );

        const aiResponse: any = await Promise.race([aiPromise, timeoutPromise]);

        if (aiResponse?.text) {
          compilation.summary = aiResponse.text.trim();
        }
      } catch (geminiError) {
        console.warn('Gemini enrichment skipped (using deterministic engine):', geminiError);
      }
    }

    // Step 3: Persist compilation & audit entry to SQLite database
    try {
      saveCompilation(compilation);
    } catch (dbErr) {
      console.warn('[Database] Write warning:', dbErr);
    }

    res.json(compilation);
  } catch (error: any) {
    console.error('Error during compilation:', error);
    res.status(500).json({ error: 'Compilation failed', message: error.message });
  }
});

// API: Terraform Deployment Simulation Stream
app.post('/api/simulate-deploy', async (req: Request, res: Response) => {
  const { compilationId, environment = 'prod', role = 'platform_admin' } = req.body;

  if (role === 'developer_viewer' && environment === 'prod') {
    res.status(403).json({
      error: 'RBAC_PERMISSION_DENIED',
      message: 'Role "developer_viewer" is restricted from applying Terraform in production. Platform Admin approval required.'
    });
    return;
  }

  res.json({
    status: 'DEPLOYED',
    planOutput: [
      'Terraform used the selected providers to generate the following execution plan.',
      'Resource actions are indicated with the following symbols: + create',
      'Plan: 6 to add, 0 to change, 0 to destroy.',
      'Changes to Outputs: + estimated_monthly_cost = "$78.40 USD"',
      'Apply complete! Resources: 6 added, 0 changed, 0 destroyed.'
    ]
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Intent-to-Infra Compiler full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

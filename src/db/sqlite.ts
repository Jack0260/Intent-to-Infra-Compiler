import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'intent_compiler.db');

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS compilations (
    id TEXT PRIMARY KEY,
    intent TEXT NOT NULL,
    environment TEXT NOT NULL,
    architecture_type TEXT NOT NULL,
    monthly_cost REAL NOT NULL,
    is_cheaper_optimized INTEGER DEFAULT 0,
    terraform_hcl TEXT NOT NULL,
    opa_rego TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    environment TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS database_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

console.log(`[Database] SQLite database successfully initialized at ${DB_PATH}`);

export function saveCompilation(compilation: any) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO compilations 
    (id, intent, environment, architecture_type, monthly_cost, is_cheaper_optimized, terraform_hcl, opa_rego, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    compilation.id,
    compilation.intent,
    compilation.environment,
    compilation.architectureType,
    compilation.costEstimate.monthlyTotal,
    compilation.isCheaperOptimized ? 1 : 0,
    compilation.terraform.mainTf,
    compilation.opaPolicy.regoCode,
    JSON.stringify(compilation),
    new Date().toISOString()
  );

  saveAuditLog(compilation.auditLog);
}

export function saveAuditLog(log: any) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO audit_logs 
    (id, timestamp, actor, role, action, environment, sha256, status, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    log.id,
    log.timestamp,
    log.actor,
    log.role,
    log.action,
    log.environment,
    log.sha256,
    log.status,
    log.details
  );
}

export function getAllCompilations(): any[] {
  const stmt = db.prepare(`SELECT * FROM compilations ORDER BY created_at DESC LIMIT 50`);
  const rows = stmt.all() as any[];
  return rows.map(r => {
    try {
      return JSON.parse(r.data_json);
    } catch {
      return r;
    }
  });
}

export function getAllAuditLogs(): any[] {
  const stmt = db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`);
  return stmt.all() as any[];
}

export function getDatabaseStats() {
  const compCount = (db.prepare(`SELECT COUNT(*) as count FROM compilations`).get() as any)?.count || 0;
  const auditCount = (db.prepare(`SELECT COUNT(*) as count FROM audit_logs`).get() as any)?.count || 0;
  return {
    engine: 'SQLite 3 (WAL mode)',
    databaseFile: 'data/intent_compiler.db',
    totalCompilations: compCount,
    totalAuditLogs: auditCount,
    status: 'ACTIVE_CONNECTED'
  };
}

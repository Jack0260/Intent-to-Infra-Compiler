import React, { useState, useEffect } from 'react';
import { CompilationResult, Environment, UserRole, AuditLogEntry } from './types/compiler';
import { compileIntent } from './lib/compilerEngine';
import { Header } from './components/Header';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatStream } from './components/ChatStream';
import { DeployModal } from './components/DeployModal';

const INITIAL_INTENT = "I need a queue that handles 10k msg/sec, costs <$100, is private, and has DLQ";

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [environment, setEnvironment] = useState<Environment>('prod');
  const [role, setRole] = useState<UserRole>('platform_admin');
  const [compilation, setCompilation] = useState<CompilationResult>(() => {
    return compileIntent(INITIAL_INTENT, 'prod', 'jackmaxwell31@gmail.com', 'platform_admin', false);
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([compilation.auditLog]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);

  // Synchronize dark mode class on document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSendIntent = async (intent: string, isCheaperRequest = false) => {
    setIsCompiling(true);
    try {
      // First attempt full-stack server API endpoint
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          environment,
          role,
          actor: 'jackmaxwell31@gmail.com',
          isCheaperRequest
        })
      });

      if (response.ok) {
        const data: CompilationResult = await response.json();
        setCompilation(data);
        setAuditLogs(prev => [data.auditLog, ...prev]);
      } else {
        // Deterministic fallback to local Go-compiler AST engine
        const fallback = compileIntent(intent, environment, 'jackmaxwell31@gmail.com', role, isCheaperRequest);
        setCompilation(fallback);
        setAuditLogs(prev => [fallback.auditLog, ...prev]);
      }
    } catch (err) {
      console.warn('Backend call failed, executing local compiler engine:', err);
      const fallback = compileIntent(intent, environment, 'jackmaxwell31@gmail.com', role, isCheaperRequest);
      setCompilation(fallback);
      setAuditLogs(prev => [fallback.auditLog, ...prev]);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleEnvironmentChange = (newEnv: Environment) => {
    setEnvironment(newEnv);
    // Recompile with the new environment constraints
    const updated = compileIntent(
      compilation.intent, 
      newEnv, 
      'jackmaxwell31@gmail.com', 
      role, 
      compilation.isCheaperOptimized
    );
    setCompilation(updated);
    setAuditLogs(prev => [updated.auditLog, ...prev]);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  const handleDownloadAll = () => {
    const bundleText = `# ==========================================
# INTENT-TO-INFRA COMPILED BUNDLE
# Environment: ${compilation.environment}
# Architecture: ${compilation.architectureType}
# Projected Cost: $${compilation.costEstimate.monthlyTotal}/mo
# ==========================================

### FILE: main.tf
${compilation.terraform.mainTf}

### FILE: variables.tf
${compilation.terraform.variablesTf}

### FILE: outputs.tf
${compilation.terraform.outputsTf}

### FILE: policy/cost_governance.rego
${compilation.opaPolicy.regoCode}

### FILE: ADR.md
# ${compilation.adr.title}
Status: ${compilation.adr.status}
Context: ${compilation.adr.context}
Decision: ${compilation.adr.decision}
`;

    const blob = new Blob([bundleText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infra-bundle-${compilation.environment}-${compilation.architectureType}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Application Navigation */}
      <Header
        environment={environment}
        onEnvironmentChange={handleEnvironmentChange}
        role={role}
        onRoleChange={handleRoleChange}
        theme={theme}
        onThemeToggle={handleToggleTheme}
        onDeployClick={() => setIsDeployOpen(true)}
        onDownloadAll={handleDownloadAll}
      />

      {/* Main Workspace: Left History/Templates Sidebar + Right ChatGPT-like Infra Stream */}
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          currentIntent={compilation.intent}
          onSelectPrompt={(p, isCheaper) => handleSendIntent(p, isCheaper)}
          onNewSession={() => handleSendIntent(INITIAL_INTENT, false)}
          isCheaperOptimized={compilation.isCheaperOptimized}
        />

        <ChatStream
          compilation={compilation}
          allAuditLogs={auditLogs}
          theme={theme}
          environment={environment}
          role={role}
          isCompiling={isCompiling}
          onSendIntent={handleSendIntent}
          onLoadCompilation={(loaded) => setCompilation(loaded)}
        />
      </div>

      {/* Deployment & Apply Simulation Modal */}
      <DeployModal
        isOpen={isDeployOpen}
        onClose={() => setIsDeployOpen(false)}
        compilation={compilation}
        role={role}
        environment={environment}
      />
    </div>
  );
}

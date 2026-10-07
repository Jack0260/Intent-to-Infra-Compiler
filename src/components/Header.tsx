import React from 'react';
import { Environment, UserRole } from '../types/compiler';
import { 
  Terminal, 
  Sun, 
  Moon, 
  Shield, 
  Play, 
  Download, 
  Sparkles, 
  Layers, 
  Flame 
} from 'lucide-react';

interface HeaderProps {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onDeployClick: () => void;
  onDownloadAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  environment,
  onEnvironmentChange,
  role,
  onRoleChange,
  theme,
  onThemeToggle,
  onDeployClick,
  onDownloadAll
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Resume Line */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md shadow-indigo-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Intent-to-Infra Compiler
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-semibold">
                Go + OPA + HCL
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5 font-medium">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Cutting provisioning time from <strong className="text-slate-700 dark:text-slate-200">2 weeks</strong> to <strong className="text-emerald-600 dark:text-emerald-400">2 mins</strong></span>
            </div>
          </div>
        </div>

        {/* Controls: Multi-env, RBAC, Actions, Theme */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-env Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => onEnvironmentChange('dev')}
              className={`px-2.5 py-1 rounded-md font-mono font-bold transition-all ${
                environment === 'dev'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              DEV
            </button>
            <button
              onClick={() => onEnvironmentChange('prod')}
              className={`px-2.5 py-1 rounded-md font-mono font-bold transition-all ${
                environment === 'prod'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              PROD
            </button>
          </div>

          {/* RBAC Role Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="platform_admin" className="bg-slate-900 text-slate-100">
                Admin (Jack M.)
              </option>
              <option value="devops_engineer" className="bg-slate-900 text-slate-100">
                DevOps Engineer
              </option>
              <option value="developer_viewer" className="bg-slate-900 text-slate-100">
                Developer (Viewer)
              </option>
            </select>
          </div>

          {/* Download Bundle */}
          <button
            onClick={onDownloadAll}
            title="Download full Terraform & OPA bundle"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export Bundle</span>
          </button>

          {/* Simulate Apply Deploy */}
          <button
            onClick={onDeployClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Apply Plan</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  FileCode2,
  GitBranch,
  Layers,
  ListOrdered,
  Lock,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { REPO_METADATA } from '../core/repoData';

export type TabType = 'console' | 'test_matrix' | 'ledger' | 'architecture' | 'registry';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  systemSolverEnabled: boolean;
  onToggleSystemSolver: () => void;
  ledgerCount: number;
  testPassCount: number;
  totalTests: number;
  onQuickReset?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemSolverEnabled,
  onToggleSystemSolver,
  ledgerCount,
  testPassCount,
  totalTests,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Core Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-emerald-500 to-indigo-600 p-[1.5px] flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-white">
                  DPCO
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                  {systemSolverEnabled ? 'v0.2 Core' : 'PoC v0.1'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {testPassCount}/{totalTests} Verified
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono tracking-tight hidden md:block">
                Deterministic Processing & Cognitive Orchestration
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'console'
                  ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Orchestrator</span>
            </button>

            <button
              onClick={() => setActiveTab('test_matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'test_matrix'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Test Matrix</span>
              <span className="text-[10px] px-1 bg-emerald-950 text-emerald-400 rounded border border-emerald-900">
                {totalTests}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'ledger'
                  ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ledger</span>
              <span className="text-[10px] px-1 bg-zinc-800 text-zinc-300 rounded font-mono">
                {ledgerCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'architecture'
                  ? 'bg-zinc-800 text-indigo-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>

            <button
              onClick={() => setActiveTab('registry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'registry'
                  ? 'bg-zinc-800 text-pink-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Registry</span>
              <span className="text-[9px] px-1 bg-pink-950 text-pink-300 rounded border border-pink-900 font-mono">
                CSP-0.2
              </span>
            </button>
          </nav>

          {/* Right Controls: Evolution Toggle & GitHub Repo */}
          <div className="flex items-center gap-3">
            {/* System Solver v0.2 Toggle */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              <span className="text-[11px] text-zinc-400">System Solver:</span>
              <button
                onClick={onToggleSystemSolver}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  systemSolverEnabled ? 'bg-cyan-500' : 'bg-zinc-700'
                }`}
                title="Toggle LinearSystemExecutor (fills CAPABILITY_GAP from PoC v0.1)"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    systemSolverEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-[10px] font-mono ${systemSolverEnabled ? 'text-cyan-400' : 'text-zinc-500'}`}>
                {systemSolverEnabled ? 'v0.2 ON' : 'v0.1 OFF'}
              </span>
            </div>

            {/* GitHub Repo Link */}
            <a
              href={REPO_METADATA.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors font-mono"
              title="View repository on GitHub"
            >
              <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">a50kv109/dpco</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

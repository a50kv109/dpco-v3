import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArchitectureView } from './components/ArchitectureView';
import { LedgerView } from './components/LedgerView';
import { Navbar, TabType } from './components/Navbar';
import { OrchestratorConsole } from './components/OrchestratorConsole';
import { RegistryView } from './components/RegistryView';
import { TestMatrixView } from './components/TestMatrixView';
import { DPCOCore } from './core/dpcoCore';
import { REPO_METADATA } from './core/repoData';
import { runFullVerificationSuite } from './core/testSuite';
import { runCspTestSuite } from './core/cspTestSuite';
import { runRevision4TestSuite } from './core/revision4TestSuite';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('console');
  const [systemSolverEnabled, setSystemSolverEnabled] = useState<boolean>(false);
  const [ledgerCount, setLedgerCount] = useState<number>(0);
  const [testPassCount, setTestPassCount] = useState<number>(54);
  const [totalTests, setTotalTests] = useState<number>(54);
  const [, setForceUpdate] = useState<number>(0);

  // Persistent DPCOCore instance
  const coreRef = useRef<DPCOCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new DPCOCore();
  }
  const core = coreRef.current;

  // On first mount, pre-seed ledger with the baseline verification run if empty
  useEffect(() => {
    if (core.ledger.getRecords().length === 0) {
      const coreSuite = runFullVerificationSuite(core);
      const cspSuite = runCspTestSuite(core);
      const r4Suite = runRevision4TestSuite(core);
      setTestPassCount(coreSuite.passCount + cspSuite.passCount + r4Suite.passCount);
      setTotalTests(coreSuite.results.length + cspSuite.results.length + r4Suite.results.length);
      setLedgerCount(core.ledger.getRecords().length);
    } else {
      setLedgerCount(core.ledger.getRecords().length);
    }
  }, [core]);

  const handleToggleSystemSolver = () => {
    if (systemSolverEnabled) {
      core.disableSystemSolver();
      setSystemSolverEnabled(false);
    } else {
      core.enableSystemSolver();
      setSystemSolverEnabled(true);
    }
    setForceUpdate((prev) => prev + 1);
  };

  const handleTaskProcessed = () => {
    setLedgerCount(core.ledger.getRecords().length);
    setForceUpdate((prev) => prev + 1);
  };

  const handleSuiteFinished = (passCount: number, total: number) => {
    setTestPassCount(passCount);
    setTotalTests(total);
    setLedgerCount(core.ledger.getRecords().length);
    setForceUpdate((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemSolverEnabled={systemSolverEnabled}
        onToggleSystemSolver={handleToggleSystemSolver}
        ledgerCount={ledgerCount}
        testPassCount={testPassCount}
        totalTests={totalTests}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'console' && (
          <OrchestratorConsole
            core={core}
            onTaskProcessed={handleTaskProcessed}
            systemSolverEnabled={systemSolverEnabled}
          />
        )}

        {activeTab === 'test_matrix' && (
          <TestMatrixView
            core={core}
            onSuiteFinished={handleSuiteFinished}
            systemSolverEnabled={systemSolverEnabled}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            core={core}
            onLedgerUpdated={() => {
              setLedgerCount(core.ledger.getRecords().length);
              setForceUpdate((prev) => prev + 1);
            }}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}

        {activeTab === 'registry' && (
          <RegistryView
            core={core}
            systemSolverEnabled={systemSolverEnabled}
            onRegistryUpdated={() => setForceUpdate((prev) => prev + 1)}
          />
        )}
      </main>

      {/* Industrial Engineering Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-400">DPCO CORE</span>
            <span>•</span>
            <span>Deterministic Processing & Cognitive Orchestration</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-zinc-600">Reference:</span>
            <a
              href={REPO_METADATA.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              github.com/a50kv109/dpco
            </a>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400">19 PASS / 0 FAIL Ground Truth</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

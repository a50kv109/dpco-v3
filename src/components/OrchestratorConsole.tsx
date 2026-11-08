import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  FileQuestion,
  Fingerprint,
  Hash,
  HelpCircle,
  Layers,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { DPCOCore } from '../core/dpcoCore';
import { ClaimVerdict, ExecStatus, PipelineStep, Task, TaskProcessResult, VerifyStatus } from '../core/models';
import { SAMPLE_TASKS } from '../core/repoData';

interface OrchestratorConsoleProps {
  core: DPCOCore;
  onTaskProcessed: () => void;
  systemSolverEnabled: boolean;
}

type InputMode = 'scalar' | 'system' | 'cognitive' | 'json';

export const OrchestratorConsole: React.FC<OrchestratorConsoleProps> = ({
  core,
  onTaskProcessed,
  systemSolverEnabled,
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('scalar');

  // Scalar inputs: a*x + b = c
  const [scalarA, setScalarA] = useState<string>('2');
  const [scalarB, setScalarB] = useState<string>('0');
  const [scalarC, setScalarC] = useState<string>('3');

  // System inputs: list of {a, b, c}
  const [systemEqs, setSystemEqs] = useState<Array<{ a: string; b: string; c: string }>>([
    { a: '1', b: '0', c: '2' },
    { a: '1', b: '1', c: '4' },
  ]);

  // Cognitive Prompt
  const [cognitivePrompt, setCognitivePrompt] = useState<string>(
    'Solve 2*x + 0 = 3 with exact rational arithmetic and check if hypothesis x = 2 is correct.'
  );

  // Raw JSON
  const [rawJson, setRawJson] = useState<string>(
    JSON.stringify(
      {
        id: 'TASK-CUSTOM-01',
        operation: 'solve_linear',
        params: { a: 2, b: 0, c: 3 },
        claim: { x: 2 },
        constraints: { exact: true },
      },
      null,
      2
    )
  );

  // Common parameters
  const [hasClaim, setHasClaim] = useState<boolean>(true);
  const [claimX, setClaimX] = useState<string>('2');
  const [exactConstraint, setExactConstraint] = useState<boolean>(true);
  const [forceExecutor, setForceExecutor] = useState<string>('none');

  // Execution state
  const [lastResult, setLastResult] = useState<TaskProcessResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeStepTab, setActiveStepTab] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Cognitive Decomposer Logic (transforms prompt into a structured DPCO Task)
  const handleDecomposePrompt = () => {
    const text = cognitivePrompt.toLowerCase();
    let op = 'solve_linear';
    let aVal: any = 2;
    let bVal: any = 0;
    let cVal: any = 3;
    let claimVal: any = null;
    let exact = text.includes('exact') || text.includes('rational') || text.includes('fraction');

    // Parse claim
    const claimMatch = text.match(/(?:claim|hypothesis|assert|if x\s*=\s*)\s*(?:x\s*=\s*)?(-?\d+(?:\/\d+)?(?:\.\d+)?)/i);
    if (claimMatch) {
      claimVal = { x: claimMatch[1] };
      setHasClaim(true);
      setClaimX(claimMatch[1]);
    } else {
      setHasClaim(false);
    }

    // Parse system or scalar
    if (text.includes('system') || text.includes('contradict') || text.includes('equations')) {
      op = 'solve_system';
      setInputMode('system');
      // Set sample contradiction or sample consistent system
      if (text.includes('contradict')) {
        setSystemEqs([
          { a: '1', b: '0', c: '2' },
          { a: '1', b: '1', c: '4' },
        ]);
      } else {
        setSystemEqs([
          { a: '1', b: '0', c: '2' },
          { a: '2', b: '0', c: '4' },
        ]);
      }
    } else {
      // Try to extract a*x + b = c
      const eqMatch = text.match(/(-?\d+(?:\/\d+)?(?:\.\d+)?)\s*\*\s*x\s*([+-]\s*\d+(?:\/\d+)?(?:\.\d+)?)\s*=\s*(-?\d+(?:\/\d+)?(?:\.\d+)?)/i);
      if (eqMatch) {
        aVal = eqMatch[1].trim();
        bVal = eqMatch[2].replace(/\s+/g, '');
        cVal = eqMatch[3].trim();
        setScalarA(aVal);
        setScalarB(bVal);
        setScalarC(cVal);
      }
      setInputMode('scalar');
    }

    setExactConstraint(exact);
  };

  const handleRunExecution = () => {
    setIsProcessing(true);

    try {
      let task: Task;

      if (inputMode === 'json') {
        const parsed = JSON.parse(rawJson);
        task = parsed;
      } else if (inputMode === 'system') {
        const eqs = systemEqs.map((eq) => ({
          a: eq.a.includes('/') ? eq.a : isNaN(Number(eq.a)) ? eq.a : Number(eq.a),
          b: eq.b.includes('/') ? eq.b : isNaN(Number(eq.b)) ? eq.b : Number(eq.b),
          c: eq.c.includes('/') ? eq.c : isNaN(Number(eq.c)) ? eq.c : Number(eq.c),
        }));

        task = {
          id: `TASK-SYS-${Date.now().toString().slice(-4)}`,
          operation: 'solve_system',
          params: { eqs },
          claim: hasClaim && claimX ? { x: claimX.includes('/') ? claimX : isNaN(Number(claimX)) ? claimX : Number(claimX) } : null,
          constraints: exactConstraint ? { exact: true } : {},
        };
      } else {
        // Scalar mode or cognitive
        const a = scalarA.includes('/') ? scalarA : isNaN(Number(scalarA)) ? scalarA : Number(scalarA);
        const b = scalarB.includes('/') ? scalarB : isNaN(Number(scalarB)) ? scalarB : Number(scalarB);
        const c = scalarC.includes('/') ? scalarC : isNaN(Number(scalarC)) ? scalarC : Number(scalarC);

        task = {
          id: `TASK-LIN-${Date.now().toString().slice(-4)}`,
          operation: 'solve_linear',
          params: { a, b, c },
          claim: hasClaim && claimX ? { x: claimX.includes('/') ? claimX : isNaN(Number(claimX)) ? claimX : Number(claimX) } : null,
          constraints: exactConstraint ? { exact: true } : {},
        };
      }

      const forced = forceExecutor === 'none' ? null : forceExecutor;
      const res = core.processTask(task, forced);
      setLastResult(res);
      setActiveStepTab(res.steps.length - 1);
      onTaskProcessed();
    } catch (err: any) {
      alert(`Task execution failed: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPreset = (preset: typeof SAMPLE_TASKS[0]) => {
    const t = preset.task;
    setExactConstraint(!!t.constraints?.exact);
    setForceExecutor((preset as any).forceExecutor || 'none');

    if (t.claim && 'x' in t.claim) {
      setHasClaim(true);
      setClaimX(String(t.claim.x));
    } else {
      setHasClaim(false);
    }

    if (t.operation === 'solve_system') {
      setInputMode('system');
      const eqs = t.params?.eqs || [];
      setSystemEqs(eqs.map((eq: any) => ({ a: String(eq.a), b: String(eq.b), c: String(eq.c) })));
    } else {
      setInputMode('scalar');
      setScalarA(String(t.params.a ?? '1'));
      setScalarB(String(t.params.b ?? '0'));
      setScalarC(String(t.params.c ?? '1'));
    }

    setRawJson(JSON.stringify(t, null, 2));
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Intro Header & Core Thesis */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                <BrainCircuit className="w-3.5 h-3.5" />
                Cognitive Hypothesis vs Deterministic Proof
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {systemSolverEnabled ? '• v0.2 System Solver Active' : '• PoC v0.1 Strict Mode'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Deterministic Processing & Cognitive Orchestrator
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl mt-1">
              The orchestrator receives hypotheses or tasks, enforces formal mathematical constraints, eliminates contradictory relations prior to execution, deterministically dispatches to audited executors, and independently verifies the result against governing equations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {SAMPLE_TASKS.slice(0, 4).map((sample, idx) => (
              <button
                key={idx}
                onClick={() => loadPreset(sample)}
                className="px-2.5 py-1.5 text-xs font-mono bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-colors flex items-center gap-1"
                title={sample.description}
              >
                <span>{sample.name.split(' - ')[0]}</span>
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Task Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-5">
            {/* Input Mode Selector */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Task Configuration
              </h2>
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
                <button
                  onClick={() => setInputMode('scalar')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    inputMode === 'scalar' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Scalar
                </button>
                <button
                  onClick={() => setInputMode('system')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    inputMode === 'system' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  System
                </button>
                <button
                  onClick={() => setInputMode('cognitive')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    inputMode === 'cognitive' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Cognitive
                </button>
                <button
                  onClick={() => setInputMode('json')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    inputMode === 'json' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {/* Mode 1: Scalar Equation */}
            {inputMode === 'scalar' && (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-center">
                  <span className="text-zinc-500 text-xs uppercase block mb-1">Governing Equation</span>
                  <span className="text-lg text-cyan-400 font-bold">
                    {scalarA || 'a'}·x {Number(scalarB) >= 0 ? `+ ${scalarB}` : `- ${Math.abs(Number(scalarB))}`} = {scalarC || 'c'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-mono text-zinc-400 block mb-1">Coeff 'a' (≠ 0)</label>
                    <input
                      type="text"
                      value={scalarA}
                      onChange={(e) => setScalarA(e.target.value)}
                      placeholder="e.g. 2 or 1/2"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-zinc-400 block mb-1">Coeff 'b'</label>
                    <input
                      type="text"
                      value={scalarB}
                      onChange={(e) => setScalarB(e.target.value)}
                      placeholder="e.g. 0 or 3"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-zinc-400 block mb-1">Coeff 'c'</label>
                    <input
                      type="text"
                      value={scalarC}
                      onChange={(e) => setScalarC(e.target.value)}
                      placeholder="e.g. 3 or 10^80"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: System of Equations */}
            {inputMode === 'system' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">Equations ({systemEqs.length})</span>
                  <button
                    onClick={() => setSystemEqs([...systemEqs, { a: '1', b: '0', c: '2' }])}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Equation
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {systemEqs.map((eq, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
                      <span className="text-xs font-mono text-zinc-500 w-6">#{i}</span>
                      <input
                        type="text"
                        value={eq.a}
                        onChange={(e) => {
                          const updated = [...systemEqs];
                          updated[i].a = e.target.value;
                          setSystemEqs(updated);
                        }}
                        className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white text-center focus:border-cyan-500"
                        title="Coefficient a"
                      />
                      <span className="text-xs font-mono text-zinc-500">·x +</span>
                      <input
                        type="text"
                        value={eq.b}
                        onChange={(e) => {
                          const updated = [...systemEqs];
                          updated[i].b = e.target.value;
                          setSystemEqs(updated);
                        }}
                        className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white text-center focus:border-cyan-500"
                        title="Coefficient b"
                      />
                      <span className="text-xs font-mono text-zinc-500">=</span>
                      <input
                        type="text"
                        value={eq.c}
                        onChange={(e) => {
                          const updated = [...systemEqs];
                          updated[i].c = e.target.value;
                          setSystemEqs(updated);
                        }}
                        className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white text-center focus:border-cyan-500"
                        title="Coefficient c"
                      />
                      {systemEqs.length > 1 && (
                        <button
                          onClick={() => setSystemEqs(systemEqs.filter((_, idx) => idx !== i))}
                          className="text-zinc-600 hover:text-red-400 p-1"
                          title="Remove equation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
                  Pairwise cross-multiplication: ContradictionGate computes a₁·d₂ vs a₂·d₁ (where d = c - b).
                </div>
              </div>
            )}

            {/* Mode 3: Cognitive Prompt */}
            {inputMode === 'cognitive' && (
              <div className="space-y-3">
                <label className="text-xs font-mono text-zinc-400 block">
                  Natural Language Query / Cognitive Hypothesis
                </label>
                <textarea
                  value={cognitivePrompt}
                  onChange={(e) => setCognitivePrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Solve 5*x - 3 = 12 with exact rational numbers and test claim x = 3"
                />
                <button
                  onClick={handleDecomposePrompt}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-mono font-medium transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Decompose into DPCO Task
                </button>
              </div>
            )}

            {/* Mode 4: Raw JSON */}
            {inputMode === 'json' && (
              <div className="space-y-3">
                <label className="text-xs font-mono text-zinc-400 block">Task JSON Specification</label>
                <textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={8}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* Dual-Stage Verification Settings (Claim & Constraints) */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              {/* Claim Assessment Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-300">
                  <input
                    type="checkbox"
                    checked={hasClaim}
                    onChange={(e) => setHasClaim(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Attach User Claim / Hypothesis</span>
                </label>
                {hasClaim && (
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-zinc-500">claim x =</span>
                    <input
                      type="text"
                      value={claimX}
                      onChange={(e) => setClaimX(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white text-center text-xs font-mono focus:border-cyan-500"
                    />
                  </div>
                )}
              </div>

              {/* Exact Arithmetic Constraint */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-300">
                  <input
                    type="checkbox"
                    checked={exactConstraint}
                    onChange={(e) => setExactConstraint(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Enforce Exact Rational Arithmetic</span>
                </label>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${exactConstraint ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-zinc-800 text-zinc-400'}`}>
                  {exactConstraint ? 'exact: true' : 'approx allowed'}
                </span>
              </div>

              {/* Force Executor Override */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-zinc-400">Force Executor Selection:</label>
                  {forceExecutor !== 'none' && (
                    <span className="text-[10px] font-mono text-amber-400">Override Active</span>
                  )}
                </div>
                <select
                  value={forceExecutor}
                  onChange={(e) => setForceExecutor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="none">None (Automatic Deterministic Dispatch)</option>
                  <option value="exact_solver">exact_solver (Fraction, Cost: 10)</option>
                  <option value="num_solver">num_solver (Float, Cost: 5)</option>
                  <option value="test_bad_solver">test_bad_solver [ADVERSARIAL] (Returns x=2.0)</option>
                  {systemSolverEnabled && (
                    <option value="linear_system_solver">linear_system_solver (v0.2 System Solver)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Launch Execution Button */}
            <button
              onClick={handleRunExecution}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 via-emerald-500 to-indigo-600 hover:from-cyan-400 hover:via-emerald-400 hover:to-indigo-500 text-zinc-950 font-bold font-mono text-sm rounded-xl transition-all shadow-lg shadow-cyan-950/50 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Dispatch & Process Task</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Visual Pipeline & Verdict (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {lastResult ? (
            <div className="space-y-6">
              {/* Verdict Tri-State Header Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-cyan-400" />
                    <span className="font-mono text-sm uppercase font-semibold text-zinc-200">
                      DPCO Tri-State Result Model
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    Task ID: {lastResult.log.task_id}
                  </span>
                </div>

                {/* 3 Independent Dimensions Badges */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {/* 1. ExecStatus */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    lastResult.log.final_executionStatus === 'SUCCESS'
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                      : lastResult.log.final_executionStatus === 'BLOCKED'
                      ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                      : 'bg-red-950/60 border-red-800/80 text-red-300'
                  }`}>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                      1. ExecStatus
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {lastResult.log.final_executionStatus}
                    </span>
                  </div>

                  {/* 2. ClaimVerdict */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    lastResult.log.final_claimVerdict === 'TRUE'
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                      : lastResult.log.final_claimVerdict === 'FALSE'
                      ? 'bg-red-950/60 border-red-800/80 text-red-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                  }`}>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                      2. ClaimVerdict
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {lastResult.log.final_claimVerdict}
                    </span>
                  </div>

                  {/* 3. VerifyStatus */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    lastResult.log.final_verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                      : lastResult.log.final_verificationStatus === 'UNVERIFIED'
                      ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                  }`}>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                      3. VerifyStatus
                    </span>
                    <span className="font-mono font-bold text-sm">
                      {lastResult.log.final_verificationStatus}
                    </span>
                  </div>
                </div>

                {/* Root & Diagnostics Information */}
                <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Executor Root:</span>
                    <span className="font-bold text-cyan-300 text-sm">
                      {lastResult.log.executor_root !== null ? `x = ${lastResult.log.executor_root}` : 'None'}
                    </span>
                  </div>

                  {lastResult.log.reason && (
                    <div className="flex items-start gap-2 pt-2 border-t border-zinc-800/60 text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="text-zinc-500 uppercase block text-[10px]">Reason / Gate Trigger</span>
                        <span>{lastResult.log.reason}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                      Executor: <strong className="text-zinc-200">{lastResult.log.executor || 'None (Gated)'}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      Duration: <strong className="text-zinc-200">{lastResult.log.exec_time_ms ?? 0}ms</strong>
                    </span>
                  </div>

                  {lastResult.log.record_hash && (
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        Ledger Block #{lastResult.log.block_index}:
                      </span>
                      <div className="flex items-center gap-1">
                        <code className="text-[10px] text-emerald-400">
                          {lastResult.log.record_hash.slice(0, 16)}...
                        </code>
                        <button
                          onClick={() => copyHash(lastResult.log.record_hash!)}
                          className="p-1 hover:text-white text-zinc-400"
                          title="Copy SHA-256 hash"
                        >
                          {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Pipeline Stepper */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Orchestration Pipeline Execution Trace
                  </h3>
                  <span className="text-xs font-mono text-zinc-500">
                    {lastResult.steps.length} Stages Passed
                  </span>
                </div>

                <div className="space-y-3">
                  {lastResult.steps.map((step, idx) => {
                    const isSelected = activeStepTab === idx;
                    const isBlocked = step.blocked;
                    const isPassed = step.passed;

                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveStepTab(idx)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800/90 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/20'
                            : 'bg-zinc-950/70 border-zinc-800 hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                              isBlocked
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : isPassed
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <span className="text-xs font-mono font-semibold text-zinc-200">
                                {step.name}
                              </span>
                              <p className="text-[11px] text-zinc-400 line-clamp-1">
                                {step.details}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              isBlocked
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : isPassed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}>
                              {isBlocked ? 'BLOCKED' : isPassed ? 'PASSED' : 'FLAGGED'}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {isSelected && step.data && (
                          <div className="mt-3 pt-3 border-t border-zinc-800 font-mono text-[11px] text-zinc-300 bg-zinc-950 p-3 rounded-lg overflow-x-auto">
                            <div className="text-zinc-500 mb-1">// Stage Metadata & Diagnostics:</div>
                            <pre className="text-cyan-300">
                              {JSON.stringify(step.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State / Quick Instructions */
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-inner">
                <Play className="w-8 h-8 fill-cyan-400/20 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white font-mono">
                  Awaiting Task Dispatch
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">
                  Configure an equation on the left or click any preset benchmark (e.g., T01 Exact, T02 False Claim, T03 Contradiction, T05 Bad Solver) to watch DPCO process every gate in real time.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 max-w-lg mx-auto text-left">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] font-mono text-cyan-400 block font-semibold">T01 Exact</span>
                  <span className="text-[11px] text-zinc-400">2x = 3 with exact BigInt rational root 3/2.</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] font-mono text-amber-400 block font-semibold">T03 Contradiction</span>
                  <span className="text-[11px] text-zinc-400">Mutually exclusive equation gate defense.</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <span className="text-[10px] font-mono text-rose-400 block font-semibold">T05 Bad Solver</span>
                  <span className="text-[11px] text-zinc-400">Independent verifier catches bogus output.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

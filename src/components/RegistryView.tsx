import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  FileCheck2,
  FileCode,
  FileText,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { CspDocument, CspValidationResult, validateCspPassport } from '../core/cspPassport';
import { DPCOCore } from '../core/dpcoCore';
import { Fraction } from '../core/fraction';

interface RegistryViewProps {
  core: DPCOCore;
  systemSolverEnabled: boolean;
  onRegistryUpdated: () => void;
}

const SAMPLE_CSP_DOCS: Record<string, CspDocument> = {
  analytics_agent: {
    passport: {
      core: 'AG.SY.DATA',
      description: 'Agent that synthesizes structured analytical reports from raw data arrays. Identifies trends and anomalies.',
      requirements: {
        reasoning_depth: 0.8,
        structure: 0.9,
        adaptability: 0.5,
      },
      meta: {
        author: 'Artsybashev Andrii Oleksiiovych',
        origin: 'CSP-0.1 Reference Environment',
        version: '0.2',
        license: 'CC BY 4.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['csv', 'json'],
          capabilities: ['parse_table', 'detect_anomalies'],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['json', 'yaml'],
        },
      ],
      constraints: {
        max_file_size_mb: 50,
        encoding: 'utf-8',
      },
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  },

  geometry_oracle: {
    passport: {
      core: 'OP.AN.VIS',
      description: 'Headless 2D Geometry Engine for Cartesian theorem validation and exact invariant analysis.',
      requirements: {
        reasoning_depth: 0.6,
        structure: 1.0,
        adaptability: 0.2,
      },
      meta: {
        author: 'AI Geometry Skill v1.0.0',
        version: '0.2',
        origin: 'a50kv109/-ai-geometry-skill-2',
        license: 'Apache-2.0',
      },
    },
    compatibility: {
      input: [
        {
          category: 'structured',
          formats: ['json'],
          capabilities: ['verify_plan', 'construct_point', 'intersect_circle'],
        },
      ],
      output: [
        {
          category: 'structured',
          formats: ['json'],
        },
      ],
      constraints: {
        exact_arithmetic: true,
        cost_weight: 8,
      },
    },
    policy: {
      admission: { status: 'accepted' },
      lifecycle: { state: 'active' },
    },
  },

  malformed_sample: {
    passport: {
      core: 'XX.AN.DATA', // Invalid Nature XX
      description: 'Malformed test document violating CSP rules.',
      requirements: {
        reasoning_depth: 1.5, // Out of bounds > 1.0
        structure: 0.5,
        adaptability: 0.2,
      },
      meta: {
        version: '99.0', // Unsupported version
      },
    },
  } as any,
};

export const RegistryView: React.FC<RegistryViewProps> = ({
  core,
  systemSolverEnabled,
  onRegistryUpdated,
}) => {
  // Executor laboratory states
  const [activeTab, setActiveTab] = useState<'executors' | 'csp_validator'>('executors');
  const [customId, setCustomId] = useState<string>('fast_rational_v2');
  const [customOp, setCustomOp] = useState<string>('solve_linear');
  const [customCost, setCustomCost] = useState<number>(3);
  const [customExact, setCustomExact] = useState<boolean>(true);
  const [customIsTest, setCustomIsTest] = useState<boolean>(false);
  const [customMultiplier, setCustomMultiplier] = useState<string>('1');
  const [registeredSuccess, setRegisteredSuccess] = useState<boolean>(false);

  // CSP-0.2 Interactive Validator states
  const [cspInputText, setCspInputText] = useState<string>(
    JSON.stringify(SAMPLE_CSP_DOCS.analytics_agent, null, 2)
  );
  const [cspValidationResult, setCspValidationResult] = useState<CspValidationResult | null>(() =>
    validateCspPassport(SAMPLE_CSP_DOCS.analytics_agent)
  );
  const [registerPassportId, setRegisterPassportId] = useState<string>('analytics_agent_01');
  const [passportRegisterSuccess, setPassportRegisterSuccess] = useState<boolean>(false);

  const executors = core.registry.getAllExecutors();

  const handleValidateCsp = () => {
    try {
      const parsed = JSON.parse(cspInputText);
      const res = validateCspPassport(parsed);
      setCspValidationResult(res);
    } catch (err: any) {
      setCspValidationResult({
        valid: false,
        errors: [`JSON_SYNTAX_ERROR: ${err?.message || err}`],
        warnings: [],
      });
    }
  };

  const handleRegisterFromPassport = () => {
    if (!cspValidationResult?.valid) return;
    try {
      const doc = JSON.parse(cspInputText) as CspDocument;
      const res = core.registry.registerPassport(registerPassportId, doc);
      if (res.success) {
        setPassportRegisterSuccess(true);
        setTimeout(() => setPassportRegisterSuccess(false), 2500);
        onRegistryUpdated();
      }
    } catch (err: any) {
      alert(`Registration failed: ${err?.message || err}`);
    }
  };

  const loadSample = (key: keyof typeof SAMPLE_CSP_DOCS) => {
    const doc = SAMPLE_CSP_DOCS[key];
    const text = JSON.stringify(doc, null, 2);
    setCspInputText(text);
    setCspValidationResult(validateCspPassport(doc));
    setRegisterPassportId(key === 'analytics_agent' ? 'analytics_agent_01' : key);
  };

  const handleRegisterCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim()) return;

    core.registerCustomExecutor(
      customId.trim(),
      [customOp],
      {
        exact_arithmetic: customExact,
        cost: Number(customCost),
        is_test: customIsTest,
        name: `Custom (${customId})`,
        description: `User-defined executor with cost ${customCost} and exact=${customExact}`,
        qualification_tier: 'DECLARED',
      },
      {
        execute: (task) => {
          try {
            const a = Fraction.from(task.params.a);
            const b = Fraction.from(task.params.b);
            const c = Fraction.from(task.params.c);
            let root = c.sub(b).div(a);
            if (customMultiplier !== '1') {
              root = root.mul(Fraction.from(customMultiplier));
            }
            return { x: root.toString() };
          } catch (err: any) {
            return { error: err?.message || String(err) };
          }
        },
      }
    );

    setRegisteredSuccess(true);
    setTimeout(() => setRegisteredSuccess(false), 2500);
    onRegistryUpdated();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-pink-950/80 text-pink-300 border border-pink-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              CSP-0.2 Capability Registry
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Nature.Action.Domain • Qualification Tiers
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Executor Registry & CSP-0.2 Validator
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl mt-1">
            Every executor possesses a structured Cognitive Skill Passport (CSP-0.2). Validation checks structural conformity, while qualification separates DECLARED capabilities from independently VERIFIED performance.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('executors')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'executors' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Solvers ({executors.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('csp_validator')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'csp_validator' ? 'bg-zinc-800 text-pink-300 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-pink-400" />
            <span>CSP-0.2 Validator</span>
          </button>
        </div>
      </div>

      {activeTab === 'executors' ? (
        <>
          {/* Active Registered Solvers Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Audited Executors & Capability Passports
              </h2>
              <span className="text-xs font-mono text-zinc-500">
                Sorted deterministically by cost & ID
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {executors.map((exec) => {
                const isTest = exec.props.is_test;
                const isExact = exec.props.exact_arithmetic;
                const passport = exec.props.passport;
                const tier = exec.props.qualification_tier || 'DECLARED';

                return (
                  <div
                    key={exec.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isTest
                        ? 'bg-rose-950/20 border-rose-900/60'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white font-mono">
                            {exec.id}
                          </h3>
                          {passport?.passport.core && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-cyan-300 border border-zinc-800 font-bold">
                              {passport.passport.core}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-400">
                          {exec.props.name || 'Standard Executor'}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-cyan-300">
                          Cost: {exec.props.cost ?? 0}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                          exec.props.effective_role === 'PRODUCTION'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : exec.props.effective_role === 'NEGATIVE_CONTROL'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          Role: {exec.props.effective_role || 'UNCLASSIFIED'}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                          tier === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : tier === 'TESTED'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          Tier: {tier}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 mb-3 line-clamp-2">
                      {exec.props.description || passport?.passport.description || 'Executor registered in DPCO runtime.'}
                    </p>

                    {/* CSP-0.2 Parameters */}
                    {passport && (
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 mb-3 space-y-1.5 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>CORE Ontology:</span>
                          <span className="text-cyan-400 font-bold">{passport.passport.core}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Cognitive Requirements:</span>
                          <span className="text-zinc-300">
                            Depth: {passport.passport.requirements.reasoning_depth} | Struct: {passport.passport.requirements.structure}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Passport Version & Author:</span>
                          <span className="text-zinc-500">
                            v{passport.passport.meta.version} ({passport.passport.meta.author?.split(' ')[0] || 'DPCO'})
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Supported Operations:</span>
                        <span className="text-zinc-200">
                          {exec.capabilities.join(', ') || 'None'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Exact Arithmetic:</span>
                        <span className={isExact ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                          {isExact ? 'YES (BigInt Rational)' : 'NO (Float32/64)'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Custom Executor Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Dynamic Routine Lab (Register New Executor)
            </h3>
            <form onSubmit={handleRegisterCustom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1">ID</label>
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1">Operation</label>
                  <select
                    value={customOp}
                    onChange={(e) => setCustomOp(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                  >
                    <option value="solve_linear">solve_linear</option>
                    <option value="solve_system">solve_system</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1">Cost Weight</label>
                  <input
                    type="number"
                    value={customCost}
                    onChange={(e) => setCustomCost(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customExact}
                    onChange={(e) => setCustomExact(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-cyan-500"
                  />
                  <span>Exact Arithmetic (Fraction)</span>
                </label>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-lg text-xs font-mono font-bold"
                >
                  {registeredSuccess ? 'Registered!' : 'Register Executor'}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        /* CSP-0.2 Interactive Validator Workbench */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: JSON/YAML Passport Editor (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-pink-400" />
                    <span className="text-xs font-mono font-bold uppercase text-zinc-200">
                      Passport Payload (CSP-0.2 Document)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="text-zinc-500">Presets:</span>
                    <button
                      onClick={() => loadSample('analytics_agent')}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Analytics Agent
                    </button>
                    <button
                      onClick={() => loadSample('geometry_oracle')}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300"
                    >
                      Geometry Oracle
                    </button>
                    <button
                      onClick={() => loadSample('malformed_sample')}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-rose-300"
                    >
                      Malformed Test
                    </button>
                  </div>
                </div>

                <textarea
                  value={cspInputText}
                  onChange={(e) => setCspInputText(e.target.value)}
                  rows={16}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-pink-500"
                />

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleValidateCsp}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run CSP-0.2 Schema Validation</span>
                  </button>

                  <span className="text-[11px] font-mono text-zinc-500">
                    Conforms to standards/CSP-0.2.md
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Validation Report & Admission (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase text-zinc-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Validation Diagnostic Report
                  </h3>
                  {cspValidationResult && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      cspValidationResult.valid
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {cspValidationResult.valid ? 'VALID PASSPORT' : 'REJECTED'}
                    </span>
                  )}
                </div>

                {cspValidationResult ? (
                  <div className="space-y-4 font-mono text-xs">
                    {/* CORE Decomposition Box */}
                    {cspValidationResult.parsedCore && (
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase block">CORE Ontology Decomposition:</span>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                            <span className="text-[9px] text-zinc-500 block">NATURE</span>
                            <span className="text-cyan-400 font-bold">{cspValidationResult.parsedCore.nature}</span>
                          </div>
                          <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                            <span className="text-[9px] text-zinc-500 block">ACTION</span>
                            <span className="text-emerald-400 font-bold">{cspValidationResult.parsedCore.action}</span>
                          </div>
                          <div className="p-2 bg-zinc-900 rounded border border-zinc-800">
                            <span className="text-[9px] text-zinc-500 block">DOMAIN</span>
                            <span className="text-pink-400 font-bold">{cspValidationResult.parsedCore.domain}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Errors List */}
                    {cspValidationResult.errors.length > 0 && (
                      <div className="p-3 bg-red-950/30 rounded-xl border border-red-900/60 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Validation Errors ({cspValidationResult.errors.length})</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-red-300 pl-5 list-disc">
                          {cspValidationResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Summary / Safe Registration */}
                    {cspValidationResult.valid && (
                      <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                        <div className="text-zinc-300 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 inline mr-1.5" />
                          Passport structure and cognitive requirements strictly conform to CSP-0.2 specification.
                        </div>

                        <div className="p-2.5 bg-zinc-900/80 rounded border border-amber-900/40 text-[10px] text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                          <strong>Architectural Invariant:</strong> Registering this passport admits declared capabilities, but sets qualification tier strictly to <code className="bg-zinc-950 px-1 py-0.5 rounded">DECLARED</code>.
                        </div>

                        <div className="space-y-2 pt-1">
                          <label className="text-[10px] text-zinc-400 block uppercase">Assign Executor ID:</label>
                          <input
                            type="text"
                            value={registerPassportId}
                            onChange={(e) => setRegisterPassportId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                          <button
                            onClick={handleRegisterFromPassport}
                            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer"
                          >
                            {passportRegisterSuccess ? 'Registered in CapabilityRegistry!' : 'Admit into Registry (DECLARED)'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500 font-mono text-xs">
                    Click "Run CSP-0.2 Schema Validation" to inspect the document.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

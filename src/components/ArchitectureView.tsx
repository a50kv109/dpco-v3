import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  ExternalLink,
  FileCode,
  FileText,
  GitBranch,
  Layers,
  Lock,
  Milestone,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { REPO_METADATA } from '../core/repoData';

export const ArchitectureView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                a50kv109/dpco
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Experimental Engineering Core
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              DPCO Architecture & Evolving Repository
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl mt-2 leading-relaxed">
              Deterministic Processing & Cognitive Orchestration decomposes problem solving into two non-overlapping spheres: cognitive hypothesis formation (LLMs or human users) and a deterministic, strictly auditable verification kernel.
            </p>
          </div>

          <a
            href={REPO_METADATA.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl font-mono text-xs font-semibold transition-all shadow-md self-start md:self-center"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Conceptual Flow Diagram */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-zinc-800 pb-4">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Conceptual Execution Flow
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Every step is sequential, deterministic, and independently gated.
          </p>
        </div>

        {/* Pipeline Nodes Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Node 1 */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">STAGE 01</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Cognitive Hypothesis</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              LLM or operator proposes equation, constraints, and candidate claim (e.g., x = 2). Confidence is NEVER mistaken for proof.
            </p>
          </div>

          {/* Node 2 */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-900">STAGE 02</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Contradiction Gate</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Checks pairwise algebraic consistency: a₁·d₂ vs a₂·d₁. Blocks inconsistent relations before compute is wasted.
            </p>
          </div>

          {/* Node 3 */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">STAGE 03</span>
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Deterministic Dispatch</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Orders compatible executors by cost, then ID. Excludes test-only solvers. Enforces exact rational arithmetic constraints.
            </p>
          </div>

          {/* Node 4 */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-900">STAGE 04</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white font-mono">Dual-Stage Verifier</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Independently substitutes root into original relations. Separately evaluates user claim against verified truth.
            </p>
          </div>
        </div>
      </div>

      {/* Fundamental Principles & Status Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Principles */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            Core Philosophical Axioms
          </h2>
          <div className="space-y-3">
            {REPO_METADATA.principles.map((pr, i) => (
              <div key={i} className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1">
                <span className="text-xs font-mono font-bold text-cyan-300 block">
                  {pr.title}
                </span>
                <p className="text-xs text-zinc-400">
                  {pr.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Status Dimensions Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Tri-State Independent Status Model
          </h2>
          <div className="space-y-3">
            {REPO_METADATA.statusDimensions.map((dim, i) => (
              <div key={i} className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {dim.name}
                  </span>
                  <div className="flex gap-1">
                    {dim.values.map((v) => (
                      <span key={v} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  {dim.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/70 text-[11px] font-mono text-zinc-400">
            <strong>Key Axiom:</strong> An executor may run successfully while its root fails verification: <code className="text-amber-300">SUCCESS / UNKNOWN / UNVERIFIED</code>.
          </div>
        </div>
      </div>

      {/* Evolution Roadmap (v0.1 -> v0.2 -> v0.3) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-zinc-800 pb-4">
          <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
            <Milestone className="w-5 h-5 text-indigo-400" />
            Evolution Roadmap (v0.1 ➔ v0.2 ➔ v0.3)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            How this workbench expands upon the initial audit findings and solves known limitations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REPO_METADATA.roadmap.map((phase, i) => (
            <div
              key={i}
              className={`p-5 rounded-2xl border space-y-4 ${
                phase.status === 'Active'
                  ? 'bg-zinc-950 border-cyan-500/50 shadow-lg shadow-cyan-950/20'
                  : phase.status === 'Completed'
                  ? 'bg-zinc-950/70 border-emerald-900/60'
                  : 'bg-zinc-950/40 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                  phase.status === 'Active'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : phase.status === 'Completed'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {phase.status}
                </span>
                <span className="text-xs font-mono text-zinc-500">{phase.phase}</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  {phase.title}
                </h3>
              </div>

              <ul className="space-y-2 text-xs font-mono text-zinc-400">
                {phase.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Manifest Inventory & Source Provenance */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Repository Manifest & Provenance Inventory
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            {REPO_METADATA.fileTree.length} Registered Nodes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPO_METADATA.fileTree.map((file, i) => (
            <div
              key={i}
              className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <code className="text-xs font-mono font-bold text-zinc-200 truncate">
                  {file.name}
                </code>
              </div>
              <p className="text-[11px] text-zinc-400">
                {file.description}
              </p>
              <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                Provenance: {file.provenance}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode,
  Fingerprint,
  Link as LinkIcon,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { DPCOCore } from '../core/dpcoCore';
import { LedgerRecord } from '../core/models';

interface LedgerViewProps {
  core: DPCOCore;
  onLedgerUpdated: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ core, onLedgerUpdated }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'jsonl'>('cards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedJsonl, setCopiedJsonl] = useState<boolean>(false);
  const [copiedRecordIdx, setCopiedRecordIdx] = useState<number | null>(null);

  // Integrity validation state
  const [integrityState, setIntegrityState] = useState<{
    tested: boolean;
    valid: boolean;
    totalBlocks: number;
    corruptedIndex?: number;
    details: string;
  } | null>(null);

  const records = core.ledger.getRecords();

  const handleVerifyChain = () => {
    const res = core.ledger.verifyChainIntegrity();
    setIntegrityState({
      tested: true,
      ...res,
    });
  };

  const handleSimulateTamper = () => {
    if (records.length === 0) {
      alert('Ledger has no records to tamper with. Run a task or test first!');
      return;
    }
    // Deliberately alter the middle or latest record's parameters in storage to simulate malicious modification
    const idx = Math.floor(records.length / 2);
    const target = records[idx];
    target.reason = 'MALICIOUS_TAMPERED_ENTRY_BYPASS';
    // Now verify chain to show cryptographic detection
    handleVerifyChain();
    onLedgerUpdated();
  };

  const handleClearLedger = () => {
    if (confirm('Are you sure you want to clear all records from the execution ledger?')) {
      core.ledger.clear();
      setIntegrityState(null);
      onLedgerUpdated();
    }
  };

  const handleDownloadJsonl = () => {
    const jsonl = core.ledger.toJsonl();
    const blob = new Blob([jsonl], { type: 'application/x-jsonlines;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `execution_ledger_${Date.now()}.jsonl`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJsonl = () => {
    const jsonl = core.ledger.toJsonl();
    navigator.clipboard.writeText(jsonl);
    setCopiedJsonl(true);
    setTimeout(() => setCopiedJsonl(false), 2000);
  };

  const filteredRecords = records.filter((r) => {
    const matchesQuery =
      searchQuery === '' ||
      r.task_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.operation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.executor || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      r.final_executionStatus === statusFilter ||
      r.final_verificationStatus === statusFilter ||
      r.final_claimVerdict === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Immutable JSONL Execution Ledger
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              SHA-256 Merkle Chained • Strict JSON
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cryptographic Audit Ledger
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl mt-1">
            Every task, constraint, executor selection, independent root verification, and final tri-state classification is permanently recorded with hash-chaining to prevent retroactive tampering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleVerifyChain}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Chain Integrity</span>
          </button>

          <button
            onClick={handleDownloadJsonl}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .jsonl</span>
          </button>

          <button
            onClick={handleCopyJsonl}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-mono font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            {copiedJsonl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedJsonl ? 'Copied!' : 'Copy JSONL'}</span>
          </button>

          <button
            onClick={handleClearLedger}
            disabled={records.length === 0}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-30"
            title="Clear Ledger"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cryptographic Chain Integrity Banner */}
      {integrityState && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
          integrityState.valid
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            : 'bg-red-950/60 border-red-800 text-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {integrityState.valid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-mono font-bold text-sm block">
                {integrityState.valid
                  ? 'Cryptographic Hash-Chain Integrity Confirmed'
                  : 'Ledger Tamper Alert: Hash Chain Broken!'}
              </span>
              <p className="text-xs font-mono opacity-90 mt-0.5">
                {integrityState.details}
              </p>
            </div>
          </div>

          <button
            onClick={handleSimulateTamper}
            className="shrink-0 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-300 hover:bg-zinc-800 transition-colors"
            title="Demonstrates DPCO cryptographic protection against post-hoc manipulation"
          >
            Simulate Tamper
          </button>
        </div>
      )}

      {/* Filter and View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Task ID, operation, or reason..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="SUCCESS">Exec: SUCCESS</option>
            <option value="BLOCKED">Exec: BLOCKED</option>
            <option value="VERIFIED">Verify: VERIFIED</option>
            <option value="UNVERIFIED">Verify: UNVERIFIED</option>
            <option value="FALSE">Claim: FALSE</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-xs">
          <span className="text-zinc-500">
            {filteredRecords.length} / {records.length} records
          </span>

          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'cards' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('jsonl')}
              className={`px-3 py-1 rounded-md transition-all ${
                viewMode === 'jsonl' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Raw JSONL
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Cards or Raw JSONL */}
      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <Lock className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-base font-semibold text-white font-mono">Ledger is Empty</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Execute any equation in the Orchestrator Console or run the Test Matrix to generate immutable audit records.
          </p>
        </div>
      ) : viewMode === 'jsonl' ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
          <div className="text-zinc-500 mb-2 border-b border-zinc-800 pb-2 flex items-center justify-between">
            <span>// execution_ledger.jsonl (Strict JSON compliant, non-standard Infinity escaped as strings)</span>
            <button
              onClick={handleCopyJsonl}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Entire Log
            </button>
          </div>
          <pre className="text-emerald-400/90 leading-relaxed space-y-1">
            {core.ledger.toJsonl()}
          </pre>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((r, i) => (
            <div
              key={r.record_hash || i}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all shadow-md space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center font-mono text-xs font-bold">
                    #{r.block_index ?? i}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {r.task_id}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-cyan-400 border border-zinc-800">
                        {r.operation}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      Timestamp: {new Date(r.timestamp * 1000).toLocaleTimeString()} • Latency: {r.exec_time_ms ?? 0}ms
                    </span>
                  </div>
                </div>

                {/* 3-Dimension status badges */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    r.final_executionStatus === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    {r.final_executionStatus}
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    r.final_claimVerdict === 'TRUE'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : r.final_claimVerdict === 'FALSE'
                      ? 'bg-red-950 text-red-300 border-red-800'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}>
                    Claim: {r.final_claimVerdict}
                  </span>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    r.final_verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : r.final_verificationStatus === 'UNVERIFIED'
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}>
                    Verify: {r.final_verificationStatus}
                  </span>
                </div>
              </div>

              {/* Data payload row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Parameters & Claim</span>
                  <div className="text-zinc-300 truncate">
                    Params: <span className="text-cyan-300">{JSON.stringify(r.params)}</span>
                  </div>
                  {r.claim && (
                    <div className="text-zinc-300 truncate">
                      Claim: <span className="text-indigo-300">{JSON.stringify(r.claim)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Execution Outcome</span>
                  <div className="text-zinc-300">
                    Executor: <span className="text-white">{r.executor || 'N/A'}</span>
                  </div>
                  <div className="text-zinc-300">
                    Root: <span className="text-emerald-400 font-bold">{r.executor_root !== null ? r.executor_root : 'None'}</span>
                  </div>
                </div>

                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Diagnostics & Reason</span>
                  <div className="text-zinc-300">
                    {r.reason ? (
                      <span className="text-amber-400">{r.reason}</span>
                    ) : (
                      <span className="text-zinc-500">None (clean execution)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hash Chaining Footer */}
              {r.record_hash && (
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1 truncate max-w-md">
                    <LinkIcon className="w-3 h-3 text-zinc-600 shrink-0" />
                    Prev: {r.prev_hash?.slice(0, 16)}...
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">SHA-256:</span>
                    <code className="text-zinc-300">{r.record_hash.slice(0, 24)}...</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(r));
                        setCopiedRecordIdx(i);
                        setTimeout(() => setCopiedRecordIdx(null), 2000);
                      }}
                      className="p-1 hover:text-white"
                      title="Copy full JSON record"
                    >
                      {copiedRecordIdx === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

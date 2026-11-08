import { LedgerRecord } from './models';

/**
 * Fast synchronous SHA-256 implementation for tamper-evident ledger chaining
 */
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const maxWord = Math.pow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2, max = Math.sqrt(n); factor <= max; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (Math.pow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  let formatted = ascii + '\x80';
  while ((formatted.length % 64) - 56 !== 0) formatted += '\x00';
  for (let i = 0; i < formatted.length; i++) {
    const j = formatted.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << (((3 - i) % 4) * 8));
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = [...hash];

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0, w2 = w[i - 2] || 0;
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const s2 = i < 16 ? (w[i] || 0) : (((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0);
      w[i] = s2;

      const s3 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const s4 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const temp1 = (hash[7] + s4 + ch + k[i] + w[i]) | 0;
      const temp2 = (s3 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function jsonSafe(value: any): any {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return value;
  }
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (typeof value === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      res[k] = jsonSafe(v);
    }
    return res;
  }
  return value;
}

export class ExecutionLedger {
  private records: LedgerRecord[] = [];
  private readonly storageKey: string = 'dpco_execution_ledger_v1';

  constructor(initialRecords: LedgerRecord[] = []) {
    this.records = [...initialRecords];
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If we already had preset records, merge or prefer saved
          this.records = parsed;
        }
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    } catch {
      // Ignore storage errors
    }
  }

  append(record: Omit<LedgerRecord, 'timestamp' | 'block_index' | 'prev_hash' | 'record_hash'>): LedgerRecord {
    const timestamp = Date.now() / 1000;
    const block_index = this.records.length;
    const prev_hash = block_index === 0
      ? '0000000000000000000000000000000000000000000000000000000000000000'
      : (this.records[block_index - 1].record_hash || '0');

    const entryToHash = {
      block_index,
      prev_hash,
      task_id: record.task_id,
      operation: record.operation,
      params: jsonSafe(record.params),
      claim: record.claim ? jsonSafe(record.claim) : null,
      constraints: record.constraints ? jsonSafe(record.constraints) : {},
      reason: record.reason,
      executor: record.executor,
      executor_root: record.executor_root,
      final_executionStatus: record.final_executionStatus,
      final_claimVerdict: record.final_claimVerdict,
      final_verificationStatus: record.final_verificationStatus,
      timestamp,
    };

    const record_hash = sha256Sync(JSON.stringify(entryToHash));

    const fullRecord: LedgerRecord = {
      ...record,
      timestamp,
      block_index,
      prev_hash,
      record_hash,
    };

    this.records.push(fullRecord);
    this.saveToStorage();
    return fullRecord;
  }

  getRecords(): LedgerRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore
    }
  }

  toJsonl(): string {
    return this.records
      .map((r) => JSON.stringify(jsonSafe(r)))
      .join('\n');
  }

  verifyChainIntegrity(): {
    valid: boolean;
    totalBlocks: number;
    corruptedIndex?: number;
    details: string;
  } {
    if (this.records.length === 0) {
      return { valid: true, totalBlocks: 0, details: 'Ledger is empty (0 blocks).' };
    }

    for (let i = 0; i < this.records.length; i++) {
      const rec = this.records[i];
      const expectedPrevHash = i === 0
        ? '0000000000000000000000000000000000000000000000000000000000000000'
        : (this.records[i - 1].record_hash || '0');

      if (rec.prev_hash !== expectedPrevHash) {
        return {
          valid: false,
          totalBlocks: this.records.length,
          corruptedIndex: i,
          details: `Prev-hash mismatch at block #${i}. Expected ${expectedPrevHash.slice(0, 8)}..., got ${rec.prev_hash?.slice(0, 8)}...`,
        };
      }

      // Re-hash check
      const entryToHash = {
        block_index: rec.block_index ?? i,
        prev_hash: rec.prev_hash,
        task_id: rec.task_id,
        operation: rec.operation,
        params: jsonSafe(rec.params),
        claim: rec.claim ? jsonSafe(rec.claim) : null,
        constraints: rec.constraints ? jsonSafe(rec.constraints) : {},
        reason: rec.reason,
        executor: rec.executor,
        executor_root: rec.executor_root,
        final_executionStatus: rec.final_executionStatus,
        final_claimVerdict: rec.final_claimVerdict,
        final_verificationStatus: rec.final_verificationStatus,
        timestamp: rec.timestamp,
      };

      const calculated = sha256Sync(JSON.stringify(entryToHash));
      if (rec.record_hash && rec.record_hash !== calculated) {
        return {
          valid: false,
          totalBlocks: this.records.length,
          corruptedIndex: i,
          details: `Content tampering detected at block #${i}. Hash altered!`,
        };
      }
    }

    return {
      valid: true,
      totalBlocks: this.records.length,
      details: `Cryptographic integrity confirmed: all ${this.records.length} blocks strictly chained with SHA-256.`,
    };
  }
}

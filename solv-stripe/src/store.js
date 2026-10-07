import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Minimal purchase log: one JSON line per paid checkout or invoice in data/purchases.jsonl.
 * Replace with your database or CRM (Coda, Notion, Google Sheets, ...) when you are ready.
 */
export function createFileStore(dir = path.resolve('data')) {
  const file = path.join(dir, 'purchases.jsonl');
  return {
    file,
    async recordPurchase(record) {
      await mkdir(dir, { recursive: true });
      await appendFile(file, JSON.stringify(record) + '\n', 'utf8');
      return record;
    },
  };
}

export function createMemoryStore() {
  const records = [];
  return {
    records,
    async recordPurchase(record) {
      records.push(record);
      return record;
    },
  };
}

/** Task IDs use fixed segment `TSK-01` and a 3-digit zero-padded suffix (project-wide max + 1). */

export const TASK_CODE_PREFIX = 'TSK-01';

const TASK_CODE_RE = /^TSK-01-(\d{3})$/i;

export function parseTaskCodeSuffix(code: string): number | null {
  const m = String(code).trim().match(TASK_CODE_RE);
  if (!m) return null;
  return parseInt(m[1], 10);
}

/**
 * Next code from existing values in this project. Only codes matching `TSK-01-NNN` participate in max;
 * other shapes are ignored for sequencing. Empty → `TSK-01-001`.
 */
export function computeNextTaskCode(existingCodes: ReadonlyArray<string>): string {
  let max = 0;
  for (const c of existingCodes) {
    const n = parseTaskCodeSuffix(c);
    if (n !== null && n > max) max = n;
  }
  const next = max + 1;
  if (next > 999) {
    throw new Error('Task code suffix exceeded 999 for this project');
  }
  return `${TASK_CODE_PREFIX}-${String(next).padStart(3, '0')}`;
}

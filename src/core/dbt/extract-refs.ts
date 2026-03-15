import type { DbtRef } from './types.js';

/**
 * Extract dbt ref() and source() calls from a SQL string using regex.
 * Does not require Jinja rendering — works on raw template SQL.
 */
export function extractDbtRefs(sql: string): DbtRef[] {
  const refs: DbtRef[] = [];

  // Match {{ ref('model_name') }} and {{ ref("model_name") }}
  const refPattern = /\{\{\s*ref\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g;
  let match;
  while ((match = refPattern.exec(sql)) !== null) {
    refs.push({ type: 'ref', name: match[1] });
  }

  // Match {{ source('source_name', 'table_name') }}
  const sourcePattern = /\{\{\s*source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g;
  while ((match = sourcePattern.exec(sql)) !== null) {
    refs.push({ type: 'source', name: match[1], table: match[2] });
  }

  return refs;
}

import type { TableRef, SqlDialect } from './types.js';

/**
 * Extract table references from a SQL string.
 * Identifies tables in FROM, JOIN, and subquery positions.
 * CTE names are tracked and excluded from external table refs.
 *
 * This is a lightweight regex/state-machine approach focused on lineage extraction,
 * not a full SQL parser. It handles the 90% case well and is fast.
 */
export function extractTableRefs(sql: string, _dialect: SqlDialect = 'generic'): TableRef[] {
  const refs: TableRef[] = [];
  const cteNames = new Set<string>();

  // Extract CTE names: look for `<name> AS (` pattern anywhere after WITH
  // This handles nested SELECTs inside CTEs correctly
  if (/\bWITH\b/i.test(sql)) {
    const cteDefPattern = /\b([a-zA-Z_][\w]*)\s+AS\s*\(/gi;
    let m;
    while ((m = cteDefPattern.exec(sql)) !== null) {
      const name = m[1].toLowerCase();
      if (!KEYWORDS.has(name)) {
        cteNames.add(name);
      }
    }
  }

  // Extract table refs from FROM and JOIN clauses
  // Pattern: FROM/JOIN <table_ref>
  // We match table name only, then separately look for alias to avoid consuming keywords
  const tablePattern =
    /\b(?:FROM|JOIN)\s+((?:[a-zA-Z_][\w]*\.)*[a-zA-Z_][\w]*)/gi;

  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    const fullName = match[1];

    // Skip keywords that look like table names
    const lower = fullName.toLowerCase();
    if (KEYWORDS.has(lower)) continue;

    // Look ahead for optional alias (AS name or just name), but don't consume keywords
    const afterMatch = sql.slice(match.index + match[0].length);
    const aliasMatch = afterMatch.match(/^\s+(?:AS\s+)?([a-zA-Z_][\w]*)/i);
    const alias = aliasMatch?.[1];

    // If "alias" is actually a keyword (WHERE, ON, JOIN, etc.), it's not a real alias
    const realAlias = alias && !KEYWORDS.has(alias.toLowerCase()) ? alias : undefined;

    const parts = fullName.split('.');
    const ref: TableRef = {
      name: parts[parts.length - 1],
      alias: realAlias,
    };

    if (parts.length >= 2) ref.schema = parts[parts.length - 2];
    if (parts.length >= 3) ref.database = parts[parts.length - 3];

    // Mark CTE references
    if (cteNames.has(ref.name.toLowerCase())) {
      ref.isCte = true;
    }

    refs.push(ref);
  }

  return refs;
}

const KEYWORDS = new Set([
  'select', 'from', 'where', 'group', 'having', 'order', 'limit', 'offset',
  'union', 'intersect', 'except', 'all', 'distinct', 'as', 'on', 'and', 'or',
  'not', 'in', 'exists', 'between', 'like', 'is', 'null', 'true', 'false',
  'case', 'when', 'then', 'else', 'end', 'inner', 'outer', 'left', 'right',
  'full', 'cross', 'natural', 'lateral', 'unnest', 'values',
  'insert', 'update', 'delete', 'into', 'set', 'create', 'alter', 'drop',
  'table', 'view', 'index', 'with', 'recursive', 'materialized',
]);

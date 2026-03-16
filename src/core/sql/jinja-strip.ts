/**
 * Strip Jinja template syntax from SQL, replacing with placeholder identifiers
 * so the resulting SQL is parseable.
 *
 * Handles:
 * - {{ ref('model') }}  → __dbt_ref__model
 * - {{ source('src', 'table') }} → __dbt_source__src__table
 * - {{ config(...) }} → (removed)
 * - {% block %} ... {% endblock %} → (removed)
 * - {# comments #} → (removed)
 * - Other {{ expressions }} → __jinja_expr
 */
export function stripJinja(sql: string): StripResult {
  const refs: JinjaRef[] = [];

  let result = sql;

  // Extract ref() calls: {{ ref('model_name') }}
  result = result.replace(
    /\{\{\s*ref\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g,
    (_match, model: string) => {
      const placeholder = `__dbt_ref__${sanitize(model)}`;
      refs.push({ type: 'ref', model, placeholder });
      return placeholder;
    },
  );

  // Extract source() calls: {{ source('source_name', 'table_name') }}
  result = result.replace(
    /\{\{\s*source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g,
    (_match, source: string, table: string) => {
      const placeholder = `__dbt_source__${sanitize(source)}__${sanitize(table)}`;
      refs.push({ type: 'source', source, table, placeholder });
      return placeholder;
    },
  );

  // Remove Jinja comments {# ... #}
  result = result.replace(/\{#[\s\S]*?#\}/g, '');

  // Remove Jinja block tags {% ... %}
  result = result.replace(/\{%[\s\S]*?%\}/g, '');

  // Replace remaining {{ expressions }} with placeholder
  result = result.replace(/\{\{[\s\S]*?\}\}/g, '__jinja_expr');

  return { sql: result, refs };
}

export interface JinjaRef {
  type: 'ref' | 'source';
  model?: string;
  source?: string;
  table?: string;
  placeholder: string;
}

export interface StripResult {
  sql: string;
  refs: JinjaRef[];
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

export type SqlDialect = 'generic' | 'snowflake' | 'bigquery' | 'postgres' | 'duckdb' | 'redshift';

export interface TableRef {
  /** Full table reference as written (e.g., "schema.table" or just "table") */
  name: string;
  /** Schema if specified */
  schema?: string;
  /** Database/catalog if specified */
  database?: string;
  /** Alias if present */
  alias?: string;
  /** Whether this is a CTE reference (resolved within the query) */
  isCte?: boolean;
}

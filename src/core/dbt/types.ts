export interface DbtProjectConfig {
  name: string;
  version?: string;
  profile?: string;
  modelPaths: string[];
  seedPaths: string[];
  testPaths: string[];
  macroPaths: string[];
  snapshotPaths: string[];
  analysisPaths: string[];
}

export interface DbtColumn {
  name: string;
  description?: string;
  dataType?: string;
  tests?: string[];
}

export interface DbtModel {
  /** Unique ID: model.<project>.<name> */
  id: string;
  name: string;
  /** Absolute file path */
  filePath: string;
  /** Relative path within model-paths */
  relativePath: string;
  /** refs and sources found in the SQL */
  refs: DbtRef[];
  /** Description from schema YAML */
  description?: string;
  /** Materialization from config */
  materialization?: string;
  /** Tags from config or YAML */
  tags?: string[];
  /** Columns from schema YAML */
  columns?: DbtColumn[];
}

export interface DbtSource {
  /** Unique ID: source.<project>.<source_name>.<table_name> */
  id: string;
  sourceName: string;
  tableName: string;
  /** Description from YAML */
  description?: string;
  /** Database from YAML */
  database?: string;
  /** Schema from YAML */
  schema?: string;
  /** Columns from YAML */
  columns?: DbtColumn[];
}

export interface DbtRef {
  type: 'ref' | 'source';
  /** For ref: model name. For source: source_name */
  name: string;
  /** For source: table name */
  table?: string;
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import type { DbtProjectConfig, DbtModel, DbtSource, DbtRef } from './types.js';
import { extractDbtRefs } from './extract-refs.js';

/**
 * Parses a dbt project directly from the filesystem.
 * No Python, no manifest.json required.
 */
export class DbtProject {
  readonly rootDir: string;
  private _config: DbtProjectConfig | null = null;
  private _models: Map<string, DbtModel> | null = null;
  private _sources: Map<string, DbtSource> | null = null;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /** Parse dbt_project.yml and return config */
  config(): DbtProjectConfig {
    if (this._config) return this._config;

    const configPath = path.join(this.rootDir, 'dbt_project.yml');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const doc = YAML.parse(raw);

    this._config = {
      name: doc.name,
      version: doc.version,
      profile: doc.profile,
      modelPaths: doc['model-paths'] ?? doc['source-paths'] ?? ['models'],
      seedPaths: doc['seed-paths'] ?? ['seeds'],
      testPaths: doc['test-paths'] ?? ['tests'],
      macroPaths: doc['macro-paths'] ?? ['macros'],
      snapshotPaths: doc['snapshot-paths'] ?? ['snapshots'],
      analysisPaths: doc['analysis-paths'] ?? ['analyses'],
    };
    return this._config;
  }

  /** Discover and parse all models */
  models(): Map<string, DbtModel> {
    if (this._models) return this._models;

    const config = this.config();
    this._models = new Map();

    for (const modelPath of config.modelPaths) {
      const fullPath = path.join(this.rootDir, modelPath);
      if (!fs.existsSync(fullPath)) continue;
      this._walkSqlFiles(fullPath, modelPath, config.name);
    }

    return this._models;
  }

  /** Discover all sources from YAML files */
  sources(): Map<string, DbtSource> {
    if (this._sources) return this._sources;

    this._sources = new Map();
    const config = this.config();

    for (const modelPath of config.modelPaths) {
      const fullPath = path.join(this.rootDir, modelPath);
      if (!fs.existsSync(fullPath)) continue;
      this._walkYamlFiles(fullPath, config.name);
    }

    return this._sources;
  }

  /** Get all refs for a given model */
  refsFor(modelName: string): DbtRef[] {
    const model = this.models().get(modelName);
    return model?.refs ?? [];
  }

  /** Build a dependency list: model name → array of model names it depends on */
  dependencyMap(): Map<string, string[]> {
    const models = this.models();
    const deps = new Map<string, string[]>();

    for (const [name, model] of models) {
      const modelDeps = model.refs
        .filter((r) => r.type === 'ref')
        .map((r) => r.name);
      deps.set(name, modelDeps);
    }

    return deps;
  }

  private _walkSqlFiles(dir: string, relativeBase: string, projectName: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this._walkSqlFiles(fullPath, relativeBase, projectName);
      } else if (entry.name.endsWith('.sql')) {
        const modelName = entry.name.replace(/\.sql$/, '');
        const sql = fs.readFileSync(fullPath, 'utf-8');
        const refs = extractDbtRefs(sql);
        const relativePath = path.relative(path.join(this.rootDir, relativeBase), fullPath);

        this._models!.set(modelName, {
          id: `model.${projectName}.${modelName}`,
          name: modelName,
          filePath: fullPath,
          relativePath,
          refs,
        });
      }
    }
  }

  private _walkYamlFiles(dir: string, projectName: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this._walkYamlFiles(fullPath, projectName);
      } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const doc = YAML.parse(raw);
          if (doc?.sources) {
            for (const source of doc.sources) {
              const sourceName = source.name;
              if (source.tables) {
                for (const table of source.tables) {
                  const id = `source.${projectName}.${sourceName}.${table.name}`;
                  this._sources!.set(id, {
                    id,
                    sourceName,
                    tableName: table.name,
                    description: table.description,
                    database: source.database,
                    schema: source.schema,
                  });
                }
              }
            }
          }
        } catch {
          // Skip unparseable YAML files
        }
      }
    }
  }
}

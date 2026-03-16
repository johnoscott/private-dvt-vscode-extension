import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Find all dbt projects under a directory by recursively searching for dbt_project.yml.
 * Stops descending into a directory once a dbt_project.yml is found (a dbt project
 * root cannot contain another dbt project root as a direct child — subdirectories
 * like models/ are part of the same project).
 */
export function findDbtProjectsInDir(rootDir: string, maxDepth = 5): string[] {
  const projects: string[] = [];
  walk(rootDir, 0, maxDepth, projects);
  return projects;
}

function walk(dir: string, depth: number, maxDepth: number, results: string[]): void {
  if (depth > maxDepth) return;

  const projectFile = path.join(dir, 'dbt_project.yml');
  if (fs.existsSync(projectFile)) {
    results.push(dir);
    return; // Don't recurse into subdirectories of a dbt project
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip common non-project directories
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), depth + 1, maxDepth, results);
    }
  } catch {
    // Permission denied, etc.
  }
}

/**
 * Walk up from a file path to find the nearest dbt_project.yml.
 * Returns the project root directory, or null if none found.
 */
export function findProjectRoot(filePath: string, stopAt?: string): string | null {
  let dir = fs.statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);

  while (true) {
    const projectFile = path.join(dir, 'dbt_project.yml');
    if (fs.existsSync(projectFile)) {
      return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    if (stopAt && dir === stopAt) break; // reached workspace root
    dir = parent;
  }

  return null;
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  '__pycache__',
  'target',
  'dbt_packages',
  'dbt_internal_packages',
  'logs',
  '.idea',
  '.vscode',
  'dist',
]);

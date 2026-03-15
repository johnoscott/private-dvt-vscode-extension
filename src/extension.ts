import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DbtProject } from './core/dbt/dbt-project.js';
import { buildManifest, manifestToGraph } from './core/dbt/manifest.js';
import { findDbtProjectsInDir, findProjectRoot } from './core/dbt/find-projects.js';
import type { DvtManifest, DvtManifestNode } from './core/dbt/manifest.js';

interface ManagedProject {
  root: string;
  project: DbtProject;
  manifest: DvtManifest;
}

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let managedProjects: ManagedProject[] = [];

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('DVT');
  outputChannel.appendLine('DVT extension activating...');

  // Discover all dbt projects across all workspace folders
  managedProjects = discoverProjects();

  if (managedProjects.length === 0) {
    outputChannel.appendLine('No dbt projects found in workspace.');
    return;
  }

  outputChannel.appendLine(`Found ${managedProjects.length} dbt project(s):`);
  for (const mp of managedProjects) {
    outputChannel.appendLine(
      `  - ${mp.manifest.project.name} (${mp.root}) — ${mp.manifest.stats.modelCount} models, ${mp.manifest.stats.sourceCount} sources`,
    );
  }

  // Status bar — shows aggregate or active project
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  updateStatusBar();
  statusBarItem.command = 'dvt.showManifest';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Associate .sql files with jinja-sql for all discovered projects
  for (const mp of managedProjects) {
    setJinjaSqlAssociation(context, mp.root);
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('dvt.showManifest', () => showManifestPanel()),
    vscode.commands.registerCommand('dvt.showLineageSummary', () => showLineageSummary()),
    vscode.commands.registerCommand('dvt.showModelInfo', () => showModelPicker()),
    vscode.commands.registerCommand('dvt.rebuild', () => rebuildAll()),
    vscode.commands.registerCommand('dvt.selectProject', () => selectProject()),
  );

  // File watchers for each project
  for (const mp of managedProjects) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(mp.root, '**/*.{sql,yml,yaml}'),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRebuild = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => rebuildProject(mp), 1000);
    };
    watcher.onDidChange(scheduleRebuild);
    watcher.onDidCreate(scheduleRebuild);
    watcher.onDidDelete(scheduleRebuild);
    context.subscriptions.push(watcher);
  }

  // Track active editor to update status bar with current project context
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()),
  );

  // Update icon theme with discovered dbt project folder names
  updateIconThemeForProjects(context, managedProjects);

  // Auto-select icon theme on first activation
  const config = vscode.workspace.getConfiguration('workbench');
  const currentIconTheme = config.get<string>('iconTheme');
  if (!currentIconTheme || currentIconTheme === 'vs-seti') {
    config.update('iconTheme', 'dvt-dbt-icons', vscode.ConfigurationTarget.Workspace);
    outputChannel.appendLine('Set DVT dbt icon theme for this workspace.');
  }

  outputChannel.appendLine('DVT extension activated.');
}

export function deactivate() {}

// --- Icon Theme ---

/**
 * Dynamically update the icon theme JSON to include discovered dbt project
 * folder names. This makes the dbt project folder icon appear for folders
 * like "analytics", "warehouse", "dbt_infomart" — names we can't know at
 * package time. VS Code watches the icon theme file and reloads automatically.
 */
function updateIconThemeForProjects(
  context: vscode.ExtensionContext,
  projects: ManagedProject[],
) {
  const iconThemePath = path.join(context.extensionPath, 'icons', 'dvt-icon-theme.json');

  try {
    const raw = fs.readFileSync(iconThemePath, 'utf-8');
    const theme = JSON.parse(raw);

    // Collect folder names of dbt project roots
    const projectFolderNames = new Set<string>();
    for (const mp of projects) {
      projectFolderNames.add(path.basename(mp.root));
    }

    // Check if we actually need to update (avoid unnecessary writes/reloads)
    const existingFolderNames = theme.folderNames || {};
    const existingExpanded = theme.folderNamesExpanded || {};
    let needsUpdate = false;

    for (const name of projectFolderNames) {
      if (existingFolderNames[name] !== '_dbt_project_folder') {
        needsUpdate = true;
        break;
      }
    }

    if (!needsUpdate) return;

    // Add project folder names to the theme
    if (!theme.folderNames) theme.folderNames = {};
    if (!theme.folderNamesExpanded) theme.folderNamesExpanded = {};

    for (const name of projectFolderNames) {
      theme.folderNames[name] = '_dbt_project_folder';
      theme.folderNamesExpanded[name] = '_dbt_project_folder_open';
    }

    fs.writeFileSync(iconThemePath, JSON.stringify(theme, null, 2), 'utf-8');
    outputChannel.appendLine(
      `Updated icon theme with dbt project folders: ${Array.from(projectFolderNames).join(', ')}`,
    );
  } catch (e) {
    outputChannel.appendLine(`Failed to update icon theme: ${e}`);
  }
}

// --- Project Discovery ---

function discoverProjects(): ManagedProject[] {
  const results: ManagedProject[] = [];
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return results;

  for (const folder of folders) {
    const projectRoots = findDbtProjectsInDir(folder.uri.fsPath);
    for (const root of projectRoots) {
      try {
        const project = new DbtProject(root);
        const manifest = buildManifest(project);
        results.push({ root, project, manifest });
      } catch (e) {
        outputChannel.appendLine(`Failed to parse dbt project at ${root}: ${e}`);
      }
    }
  }

  return results;
}

/** Find which managed project a file belongs to (walk up to dbt_project.yml) */
function projectForFile(filePath: string): ManagedProject | undefined {
  const root = findProjectRoot(filePath);
  if (!root) return undefined;
  return managedProjects.find((mp) => mp.root === root);
}

/** Get the project relevant to the active editor, or the first project */
function activeProject(): ManagedProject | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const mp = projectForFile(editor.document.uri.fsPath);
    if (mp) return mp;
  }
  return managedProjects[0];
}

// --- Status Bar ---

function updateStatusBar() {
  if (managedProjects.length === 0) return;

  if (managedProjects.length === 1) {
    const mp = managedProjects[0];
    statusBarItem.text = `$(database) ${mp.manifest.project.name}: ${mp.manifest.stats.modelCount} models`;
    statusBarItem.tooltip = `DVT — ${mp.manifest.stats.modelCount} models, ${mp.manifest.stats.sourceCount} sources, ${mp.manifest.stats.edgeCount} edges`;
  } else {
    const active = activeProject();
    const totalModels = managedProjects.reduce((n, mp) => n + mp.manifest.stats.modelCount, 0);
    if (active) {
      statusBarItem.text = `$(database) ${active.manifest.project.name} (${managedProjects.length} projects, ${totalModels} models)`;
      statusBarItem.tooltip = managedProjects
        .map((mp) => `${mp.manifest.project.name}: ${mp.manifest.stats.modelCount} models`)
        .join('\n');
    } else {
      statusBarItem.text = `$(database) DVT: ${managedProjects.length} projects, ${totalModels} models`;
    }
  }
}

// --- Language Association ---

function setJinjaSqlAssociation(context: vscode.ExtensionContext, projectRoot: string) {
  const disposable = vscode.workspace.onDidOpenTextDocument((doc) => {
    if (
      doc.languageId === 'sql' &&
      doc.uri.fsPath.startsWith(projectRoot) &&
      doc.uri.fsPath.endsWith('.sql')
    ) {
      vscode.languages.setTextDocumentLanguage(doc, 'jinja-sql');
    }
  });
  context.subscriptions.push(disposable);

  for (const doc of vscode.workspace.textDocuments) {
    if (
      doc.languageId === 'sql' &&
      doc.uri.fsPath.startsWith(projectRoot) &&
      doc.uri.fsPath.endsWith('.sql')
    ) {
      vscode.languages.setTextDocumentLanguage(doc, 'jinja-sql');
    }
  }
}

// --- Commands ---

async function selectProject() {
  if (managedProjects.length <= 1) {
    vscode.window.showInformationMessage('Only one dbt project in workspace.');
    return;
  }

  const items = managedProjects.map((mp) => ({
    label: mp.manifest.project.name,
    description: `${mp.manifest.stats.modelCount} models — ${mp.root}`,
    mp,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a dbt project',
  });

  if (picked) {
    showManifestForProject(picked.mp);
  }
}

function showManifestPanel() {
  if (managedProjects.length > 1) {
    selectProject();
    return;
  }
  const mp = activeProject();
  if (mp) showManifestForProject(mp);
}

function showManifestForProject(mp: ManagedProject) {
  const m = mp.manifest;
  outputChannel.clear();
  outputChannel.appendLine(`=== DVT Manifest: ${m.project.name} ===`);
  outputChannel.appendLine(`Root: ${mp.root}`);
  outputChannel.appendLine(`Models: ${m.stats.modelCount}`);
  outputChannel.appendLine(`Sources: ${m.stats.sourceCount}`);
  outputChannel.appendLine(`Edges: ${m.stats.edgeCount}`);
  outputChannel.appendLine(`Generated: ${m.generatedAt}`);
  outputChannel.appendLine('');

  outputChannel.appendLine('--- Models ---');
  for (const node of Object.values(m.nodes)) {
    const deps = node.refs
      .map((r) => (r.type === 'ref' ? `ref(${r.name})` : `source(${r.name}.${r.table})`))
      .join(', ');
    outputChannel.appendLine(`  ${node.name} [${node.folder}] → ${deps || '(no deps)'}`);
  }

  outputChannel.appendLine('');
  outputChannel.appendLine('--- Sources ---');
  for (const source of Object.values(m.sources)) {
    outputChannel.appendLine(`  ${source.sourceName}.${source.tableName}`);
  }

  outputChannel.show();
}

function showLineageSummary() {
  outputChannel.clear();

  for (const mp of managedProjects) {
    const graph = manifestToGraph(mp.manifest);
    const roots = graph.nodeIds().filter((id) => graph.predecessors(id).length === 0);
    const leaves = graph.nodeIds().filter((id) => graph.successors(id).length === 0);

    outputChannel.appendLine(`=== ${mp.manifest.project.name} ===`);
    outputChannel.appendLine(`Nodes: ${graph.nodeCount}, Edges: ${graph.edgeCount}, DAG: ${!graph.hasCycle()}`);
    outputChannel.appendLine(`Roots: ${roots.length}, Leaves: ${leaves.length}`);

    try {
      const sorted = graph.topologicalSort();
      outputChannel.appendLine(`Build order (first 15):`);
      for (let i = 0; i < Math.min(sorted.length, 15); i++) {
        outputChannel.appendLine(`  ${i + 1}. ${sorted[i]}`);
      }
      if (sorted.length > 15) outputChannel.appendLine(`  ... and ${sorted.length - 15} more`);
    } catch {
      outputChannel.appendLine('WARNING: Graph has cycles!');
    }
    outputChannel.appendLine('');
  }

  outputChannel.show();
}

async function showModelPicker() {
  // Collect models from all projects
  const items: Array<{
    label: string;
    description: string;
    detail: string;
    node: DvtManifestNode;
    mp: ManagedProject;
  }> = [];

  for (const mp of managedProjects) {
    const prefix = managedProjects.length > 1 ? `[${mp.manifest.project.name}] ` : '';
    for (const node of Object.values(mp.manifest.nodes)) {
      const deps = node.refs
        .map((r) => (r.type === 'ref' ? `ref(${r.name})` : `source(${r.name}.${r.table})`))
        .join(', ') || '(no dependencies)';
      items.push({
        label: `${prefix}${node.name}`,
        description: node.folder,
        detail: deps,
        node,
        mp,
      });
    }
  }

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a model to inspect',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!picked) return;

  const { node, mp } = picked;
  const graph = manifestToGraph(mp.manifest);
  const ancestors = graph.ancestors(node.id);
  const descendants = graph.descendants(node.id);
  const directDeps = graph.predecessors(node.id);
  const directChildren = graph.successors(node.id);

  outputChannel.clear();
  outputChannel.appendLine(`=== Model: ${node.name} (${mp.manifest.project.name}) ===`);
  outputChannel.appendLine(`ID: ${node.id}`);
  outputChannel.appendLine(`File: ${node.filePath}`);
  outputChannel.appendLine(`Folder: ${node.folder}`);
  outputChannel.appendLine('');
  outputChannel.appendLine(`Direct parents (${directDeps.length}):`);
  for (const id of directDeps) outputChannel.appendLine(`  ← ${id}`);
  outputChannel.appendLine(`Direct children (${directChildren.length}):`);
  for (const id of directChildren) outputChannel.appendLine(`  → ${id}`);
  outputChannel.appendLine('');
  outputChannel.appendLine(`All upstream (${ancestors.length}):`);
  for (const id of ancestors) outputChannel.appendLine(`  ${id}`);
  outputChannel.appendLine(`All downstream (${descendants.length}):`);
  for (const id of descendants) outputChannel.appendLine(`  ${id}`);

  outputChannel.show();

  const doc = await vscode.workspace.openTextDocument(node.filePath);
  await vscode.window.showTextDocument(doc, { preview: true });
}

function rebuildProject(mp: ManagedProject) {
  try {
    const fresh = new DbtProject(mp.root);
    const newManifest = buildManifest(fresh);
    mp.project = fresh;
    Object.assign(mp.manifest, newManifest);
    updateStatusBar();
    outputChannel.appendLine(
      `[${new Date().toLocaleTimeString()}] Rebuilt ${newManifest.project.name}: ${newManifest.stats.modelCount} models`,
    );
  } catch (e) {
    outputChannel.appendLine(`Failed to rebuild ${mp.root}: ${e}`);
  }
}

function rebuildAll() {
  for (const mp of managedProjects) {
    rebuildProject(mp);
  }
  vscode.window.showInformationMessage(
    `DVT: Rebuilt ${managedProjects.length} project(s)`,
  );
}

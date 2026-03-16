# DVT — Data Visualization & Transformation

A modern VS Code extension for dbt projects. Zero external dependencies, no Python required, no manifest needed.

DVT parses your dbt project directly from the filesystem — `dbt_project.yml`, model SQL files, and schema YAML — to provide instant lineage graphs, navigation, documentation, and dbt command execution.

## Requirements

- VS Code 1.85+
- A dbt project (with `dbt_project.yml`)
- Optional: `dbt` CLI on PATH for running dbt commands

No Python extension, no Jinja HTML extension, no Altimate AI account. Everything runs natively in TypeScript.

## Getting Started

1. Install the extension
2. Open a folder containing a `dbt_project.yml` (or a parent folder with multiple dbt projects)
3. DVT activates automatically and parses your project
4. Look for the status bar item showing your project name and model count

## Features

### Lineage Graph

Interactive DAG visualization of your dbt project's model dependencies.

**Full Editor Panel**
- Open via `Cmd+Shift+P` → `DVT: Show Lineage Graph`
- Canvas-based renderer — handles hundreds of models smoothly
- Left-to-right topological layout: sources on the left, marts on the right

**Bottom Panel Tab**
- Always-visible "Lineage" tab in the bottom panel (next to Terminal, Output, etc.)
- Automatically follows the active editor — open a model file and the graph centers on it

**Interactions**
- **Pan**: click and drag the canvas background
- **Zoom**: scroll wheel (zooms toward cursor position)
- **Select**: click a node to select it and highlight its lineage
- **Open file**: double-click a node to open its `.sql` file in the editor
- **Search**: type in the search bar to filter nodes by name

**Connected Highlighting**

When a node is selected:
- The selected node gets a white border with glow
- **Upstream** nodes (ancestors) are highlighted with orange borders and orange edges
- **Downstream** nodes (descendants) are highlighted with cyan borders and cyan edges
- The HUD shows upstream/downstream counts

**Display Modes** (toolbar buttons, top-right)

| Button | Mode | Behavior |
|---|---|---|
| All | Show all | Every node at full opacity |
| Dim | Dim disconnected | Unconnected nodes fade to 15% opacity |
| Focus | Hide disconnected | Unconnected nodes are completely hidden |

Click the button to cycle through modes. Default: **Dim**.

**Follow Mode** (toolbar button, top-right)

When enabled (default: on), the graph auto-centers on the model corresponding to whichever `.sql` file you have open in the editor. Switch between model files and the graph follows.

**Fit Button**

Click "Fit" to zoom and pan so all nodes fit in the viewport.

---

### Go-to-Definition

Navigate directly to referenced models and sources.

| Action | Trigger | Target |
|---|---|---|
| Go to model | `Cmd+Click` or `F12` on `{{ ref('model_name') }}` | Opens the model's `.sql` file |
| Go to source | `Cmd+Click` or `F12` on `{{ source('src', 'table') }}` | Jumps to the `name: table` line in the source YAML file |

Model names inside `ref('...')` are also rendered as clickable underlined links that navigate directly to the target file.

---

### Hover Information

Hover over `ref()` or `source()` calls to see rich metadata.

**Model hover** (`{{ ref('customers') }}`):
- Model name, folder, description
- File path
- Direct dependencies ("Depends on")
- Direct dependents ("Used by")
- Total upstream and downstream counts

**Source hover** (`{{ source('jaffle_shop', 'raw_orders') }}`):
- Source and table name
- Database and schema
- Description
- Downstream model count

If the reference doesn't resolve, a warning is shown in the hover.

---

### Auto-Completion

Intelligent completion for dbt Jinja references, triggered when you type `'` or `"` inside a ref/source call.

| Context | What completes |
|---|---|
| `{{ ref('` | All model names in the project, with folder info |
| `{{ source('` | All source names, with table counts |
| `{{ source('jaffle_shop', '` | Table names for the specified source, with schema info |

Each completion item shows the model's folder or source's schema as detail text, plus descriptions when available from YAML.

---

### Diagnostics

Real-time validation of `ref()` and `source()` references.

- **Yellow warning squiggly** on `ref('nonexistent_model')` — "Model 'nonexistent_model' not found in project"
- **Yellow warning squiggly** on `source('bad', 'ref')` — "Source 'bad.ref' not found in project"
- Warnings appear in the **Problems** panel with source label `dvt`
- Validates on file open, save, and while typing (500ms debounce)
- Automatically revalidates when the manifest rebuilds (e.g., after adding a new model file)

---

### Instant Docs

Model and source documentation rendered from your YAML schema files. No `dbt docs generate` needed.

Open via `Cmd+Shift+P` → `DVT: Show Docs`

**Model documentation** shows:
- Model name, folder, materialization, tags
- Description (from `schema.yml`)
- Columns table: name, data type, description, tests
- Direct dependencies and dependents

**Source documentation** shows:
- Source and table name
- Database and schema
- Description
- Columns table
- Downstream models

**Index view** (when no specific model is focused):
- All models grouped by folder
- All sources grouped by source name
- Brief descriptions

The docs panel updates automatically when you switch editor tabs — it follows the active model file.

---

### dbt Command Execution

Run dbt CLI commands directly from VS Code. Output streams to the DVT output channel.

**Project-level commands:**

| Command | What it runs |
|---|---|
| `DVT: dbt run` | `dbt run` in the project directory |
| `DVT: dbt test` | `dbt test` |
| `DVT: dbt build` | `dbt build` |
| `DVT: dbt compile` | `dbt compile` |

**Model-level commands** (runs against the model file open in the active editor):

| Command | What it runs |
|---|---|
| `DVT: dbt run (current model)` | `dbt run --select <model_name>` |
| `DVT: dbt test (current model)` | `dbt test --select <model_name>` |
| `DVT: dbt build (current model)` | `dbt build --select <model_name>` |

- In multi-project workspaces, project-level commands prompt you to select which project
- Model-level commands automatically detect the project from the active file
- Output streams in real-time to the DVT output channel
- Success/error notifications shown after completion
- Only one dbt command can run at a time

---

### Jinja-SQL Syntax Highlighting

Bundled TextMate grammar for SQL files with Jinja2 template syntax. No external extension needed.

- SQL keywords, functions, types, and operators
- Jinja2 blocks (`{% if %}`, `{% for %}`, `{% macro %}`)
- Jinja2 expressions (`{{ ref('...') }}`, `{{ source('...') }}`)
- Jinja2 comments (`{# ... #}`)
- dbt-specific functions highlighted: `ref`, `source`, `config`, `var`, `env_var`
- Folding support for `CASE`/`END`, Jinja blocks
- Comment toggling (`--` for line, `/* */` for block)

SQL files inside dbt project directories are automatically associated with the `jinja-sql` language.

---

### File Icons

Bundled icon theme with dbt-specific file and folder icons.

| Icon | Applied to |
|---|---|
| dbt bowtie (orange) | `.sql` files, `dbt_project.yml` |
| dbt YAML icon | `.yml`/`.yaml` files, `schema.yml`, `sources.yml`, `profiles.yml`, `packages.yml` |
| Table grid | `models/` folder |
| Database cylinder | `sources/` folder |
| Document | `seeds/` folder |
| Checkmark | `tests/` folder |
| Camera | `snapshots/` folder |
| Orange dbt folder | dbt project root folders (dynamically detected) |

The icon theme is automatically applied on first activation. You can switch back to your preferred icon theme via VS Code's icon theme picker.

---

### Multi-Project Support

DVT automatically discovers and manages multiple dbt projects in a workspace.

- Recursively searches workspace folders for `dbt_project.yml`
- Each project gets its own manifest, file watchers, and lineage graph
- Status bar shows the active project (based on which file is open)
- `DVT: Select Project` command to switch between projects
- `DVT: Inspect Model` searches across all projects
- Lineage graph, docs, and commands are project-aware

Works with:
- Single project opened as workspace root
- Parent folder containing multiple dbt projects as subdirectories
- Multi-root VS Code workspaces

---

## Commands Reference

All commands are available via `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux).

| Command | Description |
|---|---|
| `DVT: Show Lineage Graph` | Open interactive lineage DAG in full editor panel |
| `DVT: Show Docs` | Open instant documentation panel for current model |
| `DVT: Inspect Model` | Quick-pick to search and inspect any model's lineage |
| `DVT: Show Manifest` | Show manifest details in output panel |
| `DVT: Show Lineage Summary` | Show graph stats, root/leaf nodes, build order |
| `DVT: Rebuild Manifest` | Force re-parse all projects |
| `DVT: Select Project` | Switch active project in multi-project workspace |
| `DVT: dbt run` | Run `dbt run` for the project |
| `DVT: dbt test` | Run `dbt test` for the project |
| `DVT: dbt build` | Run `dbt build` for the project |
| `DVT: dbt compile` | Run `dbt compile` for the project |
| `DVT: dbt run (current model)` | Run the model open in the active editor |
| `DVT: dbt test (current model)` | Test the model open in the active editor |
| `DVT: dbt build (current model)` | Build the model open in the active editor |

## Settings

| Setting | Default | Description |
|---|---|---|
| `dvt.dbtPath` | `"dbt"` | Path to the dbt CLI executable. Set this if dbt is not on your PATH or if you use a virtualenv. |

## How It Works

DVT does **not** require dbt's `manifest.json` or `dbt docs generate`. Instead, it builds its own lightweight manifest by:

1. Reading `dbt_project.yml` for project configuration (name, model-paths, etc.)
2. Walking the model-paths directories for `.sql` files
3. Regex-extracting `{{ ref('...') }}` and `{{ source('...', '...') }}` from each file
4. Parsing schema YAML files for model/source descriptions, columns, and tests
5. Building a directed graph from the extracted dependencies

This approach means:
- **Instant startup** — no compilation step needed
- **No Python required** — everything runs in TypeScript
- **Live updates** — file watchers rebuild the manifest on save
- **Works offline** — no external services or API calls

The dbt CLI is only needed if you want to run/test/build models. All IDE features (lineage, navigation, completion, docs, diagnostics) work without it.

## Architecture

```
src/
  core/
    graph/          Pure DAG library (traversal, path-finding, topo-sort)
    sql/            SQL utilities (Jinja stripping, table ref extraction)
    dbt/            dbt project parser, manifest builder, project discovery
    lineage/        Lineage provider abstraction
  extension/
    providers/      Language providers (definition, hover, completion, links, diagnostics)
    lineage-panel   Lineage graph webview panel + bottom panel view
    docs-panel      Instant docs webview panel
    dbt-runner      dbt CLI subprocess execution
  webview/
    protocol        Message types shared between extension and webview
    lineage/        Canvas2D graph renderer (runs in webview iframe)
```

Core libraries (`core/`) have no VS Code dependencies and can be used in CLI tools or tests independently.

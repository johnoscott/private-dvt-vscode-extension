⏺ Everything's green. Here's how to run it:

  ---
  Running DVT locally in VSCode

  Step 1: Open the extension project

  Open /Users/jscott/Developer/dvt-vscode-extension in VSCode.

  Step 2: Launch the Extension Development Host

  Press F5 (or Run → Start Debugging). There are two launch configs:

  - "Run Extension" — opens the jaffle_shop fixture (5 models, good for quick testing)
  - "Run Extension (dbt_infomart)" — opens the 600+ model project (tests performance)

  This opens a second VSCode window (the Extension Development Host) with DVT loaded.

  Step 3: What you'll see

  In the Extension Development Host window:

  1. Status bar (bottom-left) — shows $(database) jaffle_shop: 5 models. Click it to show the
  manifest.
  2. Command palette (Cmd+Shift+P) — four commands available:
    - DVT: Show Manifest — dumps all models, their folders, and dependencies to the Output panel
    - DVT: Show Lineage Summary — shows graph stats, root nodes, leaf nodes, topological build order
    - DVT: Inspect Model — quick-pick to search models, then shows upstream/downstream lineage + opens
   the file
    - DVT: Rebuild Manifest — re-parses the project (also happens automatically on file changes)
  3. Jinja-SQL syntax highlighting — open any .sql file in the project. It auto-switches to jinja-sql
  language with Jinja + SQL highlighting (you'll see {{ ref('...') }} and {% ... %} colored
  differently from SQL).
  4. Output panel — View → Output → select "DVT" from the dropdown to see logs.
  5. File watcher — edit a .sql or .yml file, save it, and the manifest auto-rebuilds within 1 second
  (debounced).

  What to try

  Cmd+Shift+P → DVT: Inspect Model → type "customers"

  This shows you the full upstream/downstream lineage for the customers model and opens the file. In
  jaffle_shop you'll see:

  Upstream: stg_customers, stg_orders, stg_payments + their sources
  Downstream: (none — it's a leaf)
  Direct parents: ← model.jaffle_shop.stg_customers
                  ← model.jaffle_shop.stg_orders
                  ← model.jaffle_shop.stg_payments

  Switch to the dbt_infomart launch config to see it handle 600+ models — same commands, same speed.
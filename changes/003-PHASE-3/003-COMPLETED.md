Phase 3 additions:

  ┌─────────────────┬─────────────────────────┬────────────────────────────────────────────────────────────┐
  │     Feature     │         Command         │                        What it does                        │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Auto-Completion │ (automatic)             │ ref(' → model names, source(' → source names, source('x',  │
  │                 │                         │ ' → table names                                            │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Instant Docs    │ DVT: Show Docs          │ Model/source documentation from YAML — columns, tests,     │
  │                 │                         │ dependencies, description                                  │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ Diagnostics     │ (automatic)             │ Yellow warnings on broken ref() / source() references      │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt run         │ DVT: dbt run            │ Full project run via CLI subprocess                        │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt test        │ DVT: dbt test           │ Full project test                                          │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt build       │ DVT: dbt build          │ Full project build                                         │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt compile     │ DVT: dbt compile        │ Full project compile                                       │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt run model   │ DVT: dbt run (current   │ Run active model file                                      │
  │                 │ model)                  │                                                            │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt test model  │ DVT: dbt test (current  │ Test active model file                                     │
  │                 │ model)                  │                                                            │
  ├─────────────────┼─────────────────────────┼────────────────────────────────────────────────────────────┤
  │ dbt build model │ DVT: dbt build (current │ Build active model file                                    │
  │                 │  model)                 │                                                            │
  └─────────────────┴─────────────────────────┴────────────────────────────────────────────────────────────┘

  Project totals: 28 source files, 4,007 lines TypeScript, 115 tests, 11 SVG icons. Phases 1-3 all done — only
  Phase 4 (SQL lineage provider, graph editor, CLI backend) remains as future work.
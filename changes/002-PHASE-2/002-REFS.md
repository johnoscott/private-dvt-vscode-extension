  3.1 Auto-Completion
  - Type {{ ref(' → dropdown of all model names with folder info
  - Type {{ source(' → dropdown of source names with table counts
  - Type {{ source('jaffle_shop', ' → dropdown of table names for that specific source
  - Triggered on ' and " characters

  3.3 Diagnostics
  - Yellow warning squiggly on ref('nonexistent_model') — "Model 'nonexistent_model' not found in project"
  - Yellow warning squiggly on source('bad', 'ref') — "Source 'bad.ref' not found in project"
  - Validates on open, save, and while typing (500ms debounce)
  - Auto-revalidates when the manifest rebuilds (new model added → warning clears)
  - Diagnostic source labeled dvt in the Problems panel

  That completes 3.1 and 3.3. Remaining from Phase 3: 3.2 Instant Docs and 3.4 dbt Command Execution. Want to
  keep going?
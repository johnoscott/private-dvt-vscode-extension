import * as vscode from 'vscode';

/**
 * Shared utility: detect if the cursor/position is inside a {{ ref('...') }} or {{ source('...', '...') }}
 * call, and extract the reference info + range.
 */

export interface RefMatch {
  type: 'ref';
  model: string;
  /** Range of the entire {{ ref('model') }} expression */
  range: vscode.Range;
  /** Range of just the model name string */
  nameRange: vscode.Range;
}

export interface SourceMatch {
  type: 'source';
  source: string;
  table: string;
  /** Range of the entire {{ source('src', 'table') }} expression */
  range: vscode.Range;
  /** Range of just the table name string */
  nameRange: vscode.Range;
}

export type DbtRefMatch = RefMatch | SourceMatch;

/**
 * Find all ref() and source() calls in a document.
 */
export function findAllRefs(document: vscode.TextDocument): DbtRefMatch[] {
  const text = document.getText();
  const results: DbtRefMatch[] = [];

  // Match {{ ref('model_name') }} or {{ ref("model_name") }}
  const refPattern = /\{\{\s*ref\(\s*(['"])([^'"]+)\1\s*\)\s*\}\}/g;
  let match;
  while ((match = refPattern.exec(text)) !== null) {
    const fullStart = document.positionAt(match.index);
    const fullEnd = document.positionAt(match.index + match[0].length);

    // Find the model name within the match
    const nameStart = match.index + match[0].indexOf(match[2]);
    const nameEnd = nameStart + match[2].length;

    results.push({
      type: 'ref',
      model: match[2],
      range: new vscode.Range(fullStart, fullEnd),
      nameRange: new vscode.Range(document.positionAt(nameStart), document.positionAt(nameEnd)),
    });
  }

  // Match {{ source('source_name', 'table_name') }}
  const sourcePattern = /\{\{\s*source\(\s*(['"])([^'"]+)\1\s*,\s*(['"])([^'"]+)\3\s*\)\s*\}\}/g;
  while ((match = sourcePattern.exec(text)) !== null) {
    const fullStart = document.positionAt(match.index);
    const fullEnd = document.positionAt(match.index + match[0].length);

    // Find the table name within the match
    const tableStart = match.index + match[0].lastIndexOf(match[4]);
    const tableEnd = tableStart + match[4].length;

    results.push({
      type: 'source',
      source: match[2],
      table: match[4],
      range: new vscode.Range(fullStart, fullEnd),
      nameRange: new vscode.Range(document.positionAt(tableStart), document.positionAt(tableEnd)),
    });
  }

  return results;
}

/**
 * Find the ref/source at a specific position in the document.
 */
export function refAtPosition(document: vscode.TextDocument, position: vscode.Position): DbtRefMatch | undefined {
  const refs = findAllRefs(document);
  return refs.find((r) => r.range.contains(position));
}

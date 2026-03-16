import * as vscode from 'vscode';
import { spawn } from 'child_process';

/**
 * Executes dbt CLI commands as subprocesses.
 * No Python extension needed — just needs `dbt` on PATH or configured path.
 */
export class DbtRunner {
  private outputChannel: vscode.OutputChannel;
  private running = false;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Run a dbt command in the given project directory */
  async run(
    projectRoot: string,
    args: string[],
    label: string,
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    if (this.running) {
      vscode.window.showWarningMessage('A dbt command is already running.');
      return { code: -1, stdout: '', stderr: 'Already running' };
    }

    const dbtPath = this.getDbtPath();
    this.running = true;

    this.outputChannel.clear();
    this.outputChannel.appendLine(`$ ${dbtPath} ${args.join(' ')}`);
    this.outputChannel.appendLine(`  cwd: ${projectRoot}`);
    this.outputChannel.appendLine('');
    this.outputChannel.show(true);

    return new Promise((resolve) => {
      const proc = spawn(dbtPath, args, {
        cwd: projectRoot,
        env: { ...process.env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        this.outputChannel.append(text);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        this.outputChannel.append(text);
      });

      proc.on('close', (code) => {
        this.running = false;
        const exitCode = code ?? 1;
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(
          exitCode === 0
            ? `[${label}] completed successfully.`
            : `[${label}] failed with exit code ${exitCode}.`,
        );

        if (exitCode === 0) {
          vscode.window.showInformationMessage(`dbt ${label}: success`);
        } else {
          vscode.window.showErrorMessage(`dbt ${label}: failed (exit ${exitCode})`);
        }

        resolve({ code: exitCode, stdout, stderr });
      });

      proc.on('error', (err) => {
        this.running = false;
        const msg = err.message.includes('ENOENT')
          ? `dbt not found at '${dbtPath}'. Install dbt or set dvt.dbtPath in settings.`
          : `Failed to run dbt: ${err.message}`;
        this.outputChannel.appendLine(`ERROR: ${msg}`);
        vscode.window.showErrorMessage(msg);
        resolve({ code: -1, stdout: '', stderr: msg });
      });
    });
  }

  /** Run a specific model: dbt run --select <model> */
  runModel(projectRoot: string, modelName: string) {
    return this.run(projectRoot, ['run', '--select', modelName], `run ${modelName}`);
  }

  /** Test a specific model: dbt test --select <model> */
  testModel(projectRoot: string, modelName: string) {
    return this.run(projectRoot, ['test', '--select', modelName], `test ${modelName}`);
  }

  /** Build a specific model: dbt build --select <model> */
  buildModel(projectRoot: string, modelName: string) {
    return this.run(projectRoot, ['build', '--select', modelName], `build ${modelName}`);
  }

  /** Compile a specific model: dbt compile --select <model> */
  compileModel(projectRoot: string, modelName: string) {
    return this.run(projectRoot, ['compile', '--select', modelName], `compile ${modelName}`);
  }

  /** Run full project */
  runAll(projectRoot: string) {
    return this.run(projectRoot, ['run'], 'run');
  }

  /** Build full project */
  buildAll(projectRoot: string) {
    return this.run(projectRoot, ['build'], 'build');
  }

  private getDbtPath(): string {
    const config = vscode.workspace.getConfiguration('dvt');
    return config.get<string>('dbtPath') || 'dbt';
  }
}

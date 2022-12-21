'use strict';

import * as vscode from 'vscode';
import { ExtensionShellCommands, ExtensionShellConstructor, ExtensionShellInterface } from '../terminal/web-extension-shell';
import XtermJSShell, { SubShell } from '../terminal/xterm-shell';
import { compileTsProject, createSystem, parseTsConfig } from './typescript/index';

import { fs, vol } from 'memfs';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionShellConstructor> {
  class TypescriptExtension implements ExtensionShellInterface {
    constructor(protected shell: XtermJSShell) {

    }
    getCommands(): ExtensionShellCommands {
      return {
        'tsc': {
          fn: async (shell: SubShell, args: string[], flags: any) => {

            vol.fromNestedJSON({ '/': {
              'tsconfig.json': `
{
  "compilerOptions": {
    "module": "commonjs",
    "esModuleInterop": true,
    "target": "ES2020",
    "outDir": "dist",
    "lib": [
      "ES2020", "WebWorker"
    ],
    "incremental": true,
    "sourceMap": true,
    "rootDir": "src",
    "strict": true   /* enable all strict type-checking options */
    /* Additional Checks */
    // "noImplicitReturns": true, /* Report error when not all code paths in function return a value. */
    // "noFallthroughCasesInSwitch": true, /* Report errors for fallthrough cases in switch statement. */
    // "noUnusedParameters": true,  /* Report errors on unused parameters. */
  }
}`,
  'src': {
    'index.ts': `console.log('hello);`
  }
          }});
            shell.shell.env['PWD'] = shell.shell.env['CWD'];
            const sys = createSystem(shell.shell, args);
            const parsedConfig = parseTsConfig(sys);

            shell.print("Compiling...");
            compileTsProject(sys, parsedConfig);
            shell.print("Done");
          }
        }
      }
    }
  }
  return TypescriptExtension;
}

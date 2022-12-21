'use strict';

import * as vscode from 'vscode';
import { ExtensionShellCommands, ExtensionShellConstructor, ExtensionShellInterface } from '../terminal/web-extension-shell';
import XtermJSShell, { SubShell } from '../terminal/xterm-shell';
import { compileTsProject, createSystem, parseTsConfig } from './typescript/index';

import { vol } from 'memfs';
import ts from 'typescript';
import { createMemFsLoader, MemFsLoader } from '../terminal/filesystem/mem-fs';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionShellConstructor> {
  class TypescriptExtension implements ExtensionShellInterface {
    constructor(protected shell: XtermJSShell) {

    }
    getCommands(): ExtensionShellCommands {
      return {
        'tsc': {
          fn: async (shell: SubShell, args: string[], flags: any) => {

            const memFs = getMemFs();

            if(memFs) {
              await memFs.loadFromGlob('/tsconfig.json');
              vol.fromNestedJSON({ '/': {    'src': {'index.ts': `import fs from 'fs'; console.log('hello');fs.write(1);` }}});
              shell.shell.env['PWD'] = shell.shell.env['CWD']+'node_modules/typescript/lib/';
              const sys = createSystem(shell.shell, args, memFs.fs);
              const parsedConfig = parseTsConfig(sys);
              await addCompilerOptionLibs(parsedConfig.options, memFs);
              shell.printLine("Compiling...");
              compileTsProject(sys, parsedConfig);
              shell.printLine("Done");
            }
          }
        }
      }
    }
  }
  return TypescriptExtension;
}
const getMemFs = () => {
  const workspaces = vscode.workspace.workspaceFolders
  if (!workspaces || !workspaces[0]) {
    return;
  }
  const workspace = workspaces[0];
  return createMemFsLoader(workspace);
}
const addCompilerOptionLibs = async (options: ts.CompilerOptions, memFsLoader: MemFsLoader): Promise<void> => {
  return memFsLoader.loadFromGlob(['/node_modules/typescript/lib/*.d.ts','node_modules/@types/**/*.d.ts'])
}
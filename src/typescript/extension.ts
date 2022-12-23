'use strict';

import * as vscode from 'vscode';
import { compileTsProject, createSystem, parseTsConfig } from './typescript/index';

import { vol } from 'memfs';
import { createMemFsLoader, MemFsLoader } from '../terminal/filesystem/mem-fs';
import { ExtensionShellCommands, ExtensionShellConstructor, ExtensionShellInterface, VSShellEnv } from '../terminal/ext';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionShellConstructor> {
  class TypescriptExtension implements ExtensionShellInterface {
    constructor(protected shell: VSShellEnv) {

    }
    getCommands(): ExtensionShellCommands {
      return {
        'tsc': {
          fn: async (shell: VSShellEnv, args: string[], flags: any) => {

            const memFs = createMemFsLoader(shell);

            if(memFs) {
              await memFs.loadFromGlob('/tsconfig.json');
              vol.fromNestedJSON({ '/': {    'src': {'index.ts': `import fs from 'fs'; console.log('hello');fs.write(1);` }}});
              shell.setEnvironmentVariable('PWD', shell.getEnvironmentVariable('CWD')+'node_modules/typescript/lib/');
              const sys = createSystem(shell, args, memFs.fs);
              const parsedConfig = parseTsConfig(sys);
              await addCompilerOptionLibs(memFs);
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
const addCompilerOptionLibs = async ( memFsLoader: MemFsLoader): Promise<void> => {
  return memFsLoader.loadFromGlob(['/node_modules/typescript/lib/*.d.ts','node_modules/@types/**/*.d.ts'])
}
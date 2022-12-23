'use strict';

import * as vscode from 'vscode';
import type { ExtensionShellCommands, ExtensionShellConstructor, ExtensionShellInterface, VSShellEnv } from '../terminal/ext';
import { fastGlob, FastGlobEnvironment } from '../terminal/filesystem/fast-glob';
import type { ParsedArgs } from 'minimist';

export async function activate(context?: vscode.ExtensionContext): Promise<ExtensionShellConstructor> {
  class AssemplyScriptExtension implements ExtensionShellInterface {
    constructor(protected shell: VSShellEnv) {

    }
    getCommands(): ExtensionShellCommands {
      return {
        'asc': {
          fn: async (shell: VSShellEnv, args: string[], flags: ParsedArgs|undefined): Promise<void> => {
            console.log('Not Implemented Yet');
          }
        }
      }
    }
  } 
  return AssemplyScriptExtension;
}

'use strict';

import * as vscode from 'vscode';
import type { WebFileSystemProvider } from '../terminal/filesystem/provider';
import type { ExtensionShellInterface } from '../terminal/web-extension-shell';
import { SubShell } from '../terminal/xterm-shell';

import { vol } from 'memfs';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionShellInterface> {
  let fsProvider: WebFileSystemProvider;
  const extensions: ExtensionShellInterface = {
    commands: {
      'tsc': {
        fn: async (shell: SubShell, args: string[], flags: any) => {
          
        }
      }
    },
    setFileSystemProvider: function (provider: WebFileSystemProvider): void {
      fsProvider = provider;
    }
  }
  return extensions;
}

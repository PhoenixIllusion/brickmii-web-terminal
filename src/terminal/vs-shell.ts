'use strict';
import * as vscode from 'vscode';
import { Terminal } from "./term";
import XtermJSShell, { ShellEnv } from "./xterm-shell";
import { VSShellEnv } from './ext';


export class VSShell extends XtermJSShell<VSShellEnv> {
  constructor(term: Terminal) {
    super(term, {
      createShellEnv: (shell: ShellEnv) => ({
        ...shell,
        getFs: () => ({ ... vscode.workspace.fs, FileType: vscode.FileType, FilePermission: vscode.FilePermission}),
        getWorkspaceFolder: () => {
          const workspaces = vscode.workspace.workspaceFolders;
          if (!workspaces || !workspaces[0]) {
            return null;
          }
          return workspaces[0].uri;
        }
      })
    });
  }
}

'use strict';
import * as vscode from 'vscode';
import { Terminal } from "./term";
import XtermJSShell, { ShellEnv, ShellEnvFactory } from "./xterm-shell";
import { VSShellEnv } from './ext';
import { WrapFromCWD } from './filesystem/vs-like';


export class VSShell extends XtermJSShell<VSShellEnv> {
  constructor(term: Terminal) {
    super(term, VSShell.createShellEnv());
  }
  static createShellEnv(): ShellEnvFactory<VSShellEnv> {
    const fs = { ... vscode.workspace.fs, FileType: vscode.FileType, FilePermission: vscode.FilePermission};
    const getWorkspaceFolder = () => {
      const workspaces = vscode.workspace.workspaceFolders;
      if (!workspaces || !workspaces[0]) {
        return null;
      }
      return workspaces[0].uri;
    };
    return {
      createShellEnv: (shell: ShellEnv) => ({
        ...shell,
        getFs: () => fs,
        getWorkspaceFolder,
        getFsFromCwd: () => WrapFromCWD({
          withCWD: () => shell.getCurrentWorkingDirectory(),
          withWorkspace: getWorkspaceFolder
        }, fs)
      })
    }
  }
}

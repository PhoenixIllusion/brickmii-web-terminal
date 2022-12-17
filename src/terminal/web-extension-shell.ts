'use strict';

import * as vscode from 'vscode';
import posix from 'path';
import { LocalEchoController_VS } from './local-echo-vs/local-echo-vs';
import XtermJSShell_VS, { SubShell } from './xterm-shell-vs';


const ReadDirectory = async (folder: vscode.Uri): Promise<{name:string, type: 'File'|'Directory'}[]> => {
  const response:{name:string, type: 'File'|'Directory'} [] = [];
  for (const [name, type] of await vscode.workspace.fs.readDirectory(folder)) {
    if (type === vscode.FileType.File) {
      response.push({name, type: 'File'})
    }
    if (type === vscode.FileType.Directory) {
      response.push({name, type: 'Directory'})
    }
  }
  return response;
}

class NavShell {
  CWD: string[] = [];
  workspace: vscode.WorkspaceFolder|null = null;

  constructor(private term: XtermJSShell_VS) {
    term.prompt = async () => (this.CWD.slice(-1)||"")+'$> ';
    term.command('ls', this.ls.bind(this));
    term.command('cd', this.cd.bind(this));
    term.command('pwd', this.pwd.bind(this));
  }

  setWorkspace(path: vscode.WorkspaceFolder) {
    this.workspace = path;
  }

  private path(workspace: vscode.WorkspaceFolder, entry?:string): vscode.Uri {
    let path = "";
    const dirs = [workspace.uri.path, ... this.CWD];
    if(entry) {
      dirs.push(entry);
    }
    if(dirs.length > 0) {
      path = posix.join(... dirs);
    }
    if(entry && entry.startsWith('/')){
      path = posix.join(workspace.uri.path, entry);
    }
    return workspace.uri.with({ path })
  }

  async ls(shell: SubShell, args: any, flags?: any) {
    if(this.workspace) {
      const workspace = this.workspace;
      const entries = await ReadDirectory(this.path(workspace));
      shell.printList(entries.map( entry => `${entry.type.substring(0,1)} - ${entry.name}`));
    } else {
      shell.printLine("Not currently in workspace")
    }
  }
  async pwd(shell: SubShell) {
    shell.printLine('/'+this.CWD.join('/'));
  }
  async cd(shell: SubShell, args: any, flags?: any) {
    if(this.workspace) {
      const workspace = this.workspace;
      if(args.length != 1) {
        shell.printLine("Usage: cd <path>")
        return;
      }
      const path = args[0];
      if(path == ".") {
        return;
      }
      if(path == "..") {
        if(this.CWD.length == 0) {
          shell.printLine("Cannot navigate below root directory");
          return;
        }
        this.CWD.pop();
        return;
      }
      try {
        const dirPath = this.path(workspace, path);
        const stat = await vscode.workspace.fs.stat(dirPath);
        if(stat.type != vscode.FileType.Directory) {
          shell.printLine(`File ${path} is not a folder`);
          return;
        }
        this.CWD = posix.normalize(posix.join(... this.CWD, path)).split('/');
      } catch (x){
        console.error(x);
        shell.printLine(`Folder ${path} not found`)
      }
    } else {
      shell.printLine("Not currently in workspace")
    }
  }
}

const configureShell = (term: XtermJSShell_VS, navShell: NavShell) => {
  term.command('help', async (shell) => {
    await shell.printLine(`
Try running one of these commands:
${shell.commands.map((command) => ` - ${command}`).join('\n')}

`)
  });
}

export class WebExtensionShell implements vscode.Pseudoterminal{
  writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string>;
  localEcho: LocalEchoController_VS;
  shell: XtermJSShell_VS;
  navShell: NavShell;
  constructor() {
    this.onDidWrite = this.writeEmitter.event;
    this.localEcho = new LocalEchoController_VS(this.writeEmitter);
    this.shell = new XtermJSShell_VS(this.localEcho);
    this.navShell = new NavShell(this.shell);
    configureShell(this.shell, this.navShell);
  }
  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces || !workspaces[0]) {
      this.writeEmitter.fire('No folder or workspace opened');
      return;
    }
    const workspace = workspaces[0];
    this.navShell.setWorkspace(workspace);
    if(initialDimensions) {
      this.localEcho.handleTermResize(initialDimensions);
    }
    this.shell.repl();
  }
  handleInput(data: string) {
    this.localEcho.handleTermData(data);
  }
  setDimensions(dimensions: vscode.TerminalDimensions) {
    this.localEcho.handleTermResize(dimensions);
  }
  close(): void {
    
  }


} 

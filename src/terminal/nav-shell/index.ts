import * as vscode from 'vscode';
import posix from 'path';
import XtermJSShell, { SubShell } from '../xterm-shell';

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

export class NavShell {
  CWD: string[] = [];
  get workspace(): vscode.WorkspaceFolder|null {
    const workspaces = vscode.workspace.workspaceFolders
    if (!workspaces || !workspaces[0]) {
      return null;
    }
    return workspaces[0];
  };

  constructor(private term: XtermJSShell) {
    term.prompt = async () => (this.CWD.slice(-1)||"")+'$> ';
    term.command('ls', this.ls.bind(this));
    term.command('cd', this.cd.bind(this));
    term.command('pwd', this.pwd.bind(this));
    this.updateENV();
  }

  private updateENV() {
    this.term.env['CWD'] = '/'+this.CWD.join('/');
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
        this.updateENV();
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
        this.updateENV();
      } catch (x){
        console.error(x);
        shell.printLine(`Folder ${path} not found`)
      }
    } else {
      shell.printLine("Not currently in workspace")
    }
  }
}
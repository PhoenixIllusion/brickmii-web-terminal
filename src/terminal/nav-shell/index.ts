import posix from 'path';
import { ExtensionShellCommands, ExtensionShellInterface, VSShellEnv } from '../ext';
import * as like from '../filesystem/vs-like';
import { FileType } from 'vscode';
import { fastGlob } from '../filesystem/fast-glob';
import { AutoCompleteResponse } from '../local-echo/local-echo';

const ReadDirectory = async (folder: like.Uri, fs: like.FileSystem): Promise<{name:string, type: 'File'|'Directory'}[]> => {
  const response:{name:string, type: 'File'|'Directory'} [] = [];
  for (const [name, type] of await fs.readDirectory(folder)) {
    if (type === FileType.File) {
      response.push({name, type: 'File'})
    }
    if (type === FileType.Directory) {
      response.push({name, type: 'Directory'})
    }
  }
  return response;
}

export class NavShell implements ExtensionShellInterface{
  CWD: string[] = [];

  constructor(private env: VSShellEnv) {
    env.setPrompt(async () => (this.CWD.slice(-1)||"")+'$> ');
    this.updateENV(env);
  }

  private updateENV(env: VSShellEnv) {
    env.setEnvironmentVariable('CWD','/'+this.CWD.join('/'));
  }

  private path(uri: like.Uri, entry?:string): like.Uri {
    let path = "";
    const dirs = [uri.path, ... this.CWD];
    if(entry) {
      dirs.push(entry);
    }
    if(dirs.length > 0) {
      path = posix.join(... dirs);
    }
    if(entry && entry.startsWith('/')){
      path = posix.join(uri.path, entry);
    }
    return uri.with({ path })
  }

  async ls(shell: VSShellEnv, args: any, flags?: any) {
    const uri = shell.getWorkspaceFolder();
    if(uri) {
      const entries = await ReadDirectory(this.path(uri), shell.getFs());
      shell.printList(entries.map( entry => `${entry.type.substring(0,1)} - ${entry.name}`));
    } else {
      shell.printLine("Not currently in workspace")
    }
  }
  async pwd(shell: VSShellEnv) {
    shell.printLine('/'+this.CWD.join('/'));
  }

  async cd(env: VSShellEnv, args: any, flags?: any) {
    const uri = env.getWorkspaceFolder();
    if(uri) {
      if(args.length != 1) {
        env.printLine("Usage: cd <path>")
        return;
      }
      const path = args[0];
      if(path == ".") {
        return;
      }
      if(path == "..") {
        if(this.CWD.length == 0) {
          env.printLine("Cannot navigate below root directory");
          return;
        }
        this.CWD.pop();
        this.updateENV(env);
        return;
      }
      try {
        const dirPath = this.path(uri, path);
        const stat = await env.getFs().stat(dirPath);
        if(stat.type != FileType.Directory) {
          env.printLine(`File ${path} is not a folder`);
          return;
        }
        this.CWD = posix.normalize(posix.join(... this.CWD, path)).split('/');
        this.updateENV(env);
      } catch (x){
        console.error(x);
        env.printLine(`Folder ${path} not found`)
      }
    } else {
      env.printLine("Not currently in workspace")
    }
  }
  async autoCD(index: number, args: string[], ... argv: any[]): Promise<AutoCompleteResponse[]> {
    const uri = this.env.getWorkspaceFolder();
    if(uri) {
      let path = '';
      if(args[0] && args[0].lastIndexOf('/')>0) {
        path = args[0].substring(0,args[0].lastIndexOf('/')+1);
      }
      const dirContent = (await ReadDirectory(this.path(uri,path), this.env.getFs()));
      const entries = dirContent.map(val => {
        let ret = val.name
        if(val.type==='Directory'){
          ret +='/'
        }
        return path+ret;
      });
      return entries.map<AutoCompleteResponse>(entry => ({value: entry, isPartial: true}));
    }
    return [];
  }
  getCommands(): ExtensionShellCommands {
    return {
      'ls':  {fn: this.ls.bind(this)},
      'cd':  {
        fn: this.cd.bind(this),
        autoComplete: this.autoCD.bind(this)
      },
      'pwd': {fn: this.pwd.bind(this)}
    }
  }
}
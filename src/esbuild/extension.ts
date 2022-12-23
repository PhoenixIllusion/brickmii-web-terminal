'use strict';

import * as vscode from 'vscode';
import type { ExtensionShellCommands, ExtensionShellConstructor, ExtensionShellInterface, VSShellEnv } from '../terminal/ext';
import { fastGlob, FastGlobEnvironment } from '../terminal/filesystem/fast-glob';
import * as esbuild from 'esbuild-wasm';
import type { ParsedArgs } from 'minimist';
import { VsCodePlugin } from './vscode-plugin';

let esBuildInit: Promise<void>;

export async function activate(context?: vscode.ExtensionContext): Promise<ExtensionShellConstructor> {
  class ESBuildExtension implements ExtensionShellInterface {
    constructor(protected shell: VSShellEnv) {

    }
    getCommands(): ExtensionShellCommands {
      return {
        'esbuild': {
          fn: async (shell: VSShellEnv, args: string[], flags: ParsedArgs|undefined): Promise<void> => {
            let wasmModule:WebAssembly.Module|undefined = undefined;
            if(!esBuildInit) {
              const wasmBuffer = await fetch(context?.extensionUri.toString()+'/esbuild.0.16.10.wasm').then(res => res.arrayBuffer());
              wasmModule = new WebAssembly.Module(wasmBuffer);
            }
            const files = await performEsBuild(shell, flags,wasmModule);
            console.log(files);
          }
        }
      }
    }
  } 
  return ESBuildExtension;
}

export const performEsBuild = async (env: VSShellEnv, flags: ParsedArgs|undefined, wasmModule?: WebAssembly.Module) => {
  const glob = fastGlob(env);
  if(!glob) {
    env.onError(new Error("Error: Unable to activate Glob FS"));
    return;
  }
  const options = await validateESBuildArgs(glob, flags);
  if(!options) {
    env.onError(new Error("Error: Invalid Options given for ESBuild"));
    return;
  }
  if(!esBuildInit) {
    esBuildInit = esbuild.initialize({ wasmModule, worker: false});
  }
  await esBuildInit;
  
  options.absWorkingDir = env.getCurrentWorkingDirectory();
  await compileEsBuild(glob, options);
}

export const compileEsBuild = async (glob: FastGlobEnvironment, options: esbuild.BuildOptions) => {
  const outputFiles = await esbuild.build({
    ... options,
    write: false,
    plugins: [
      new VsCodePlugin(glob).getPlugin()
    ]
  })
  return outputFiles;
}

export const validateESBuildArgs = async (glob: FastGlobEnvironment, flags?: ParsedArgs): Promise<esbuild.BuildOptions|undefined> => {
  let options: esbuild.BuildOptions = {};
  if(flags) {
    Object.assign(options, flags);
    delete (options as any)['_'];
  }
  let configFile = 'esbuild.json';
  let hasConfigFile = false;
  if(flags && flags['c']) {
    if(flags['c'].endsWith('.json')) {
      configFile = flags['c'];
      hasConfigFile = true;
    }
    delete flags['c'];
  }
  if(flags && flags['config']) {
    if(flags['config'].endsWith('json')) {
      configFile = flags['config'];
      hasConfigFile = true;
    }
    delete flags['config']
  }
  const config = await glob.fs.readFile(configFile);
  if(config) {
    options = Object.assign(config, options);
  }
  if(flags && flags._.length > 0) {
    options.entryPoints = flags._;
  }
  return options;
}

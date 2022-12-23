'use strict';

import { AutoComplete } from "./local-echo/local-echo";
import { Command, ShellEnv } from "./xterm-shell";
import * as like from './filesystem/vs-like'

export interface ExtensionShellCommands {
  [command:string]: {fn: Command<VSShellEnv>, autoComplete?: AutoComplete}
}
export interface ExtensionShellConstructor {
  new(shell: VSShellEnv): ExtensionShellInterface;
}


export interface ExtensionShellInterface {
  getCommands():ExtensionShellCommands;
}

export interface VSShellEnv extends ShellEnv {
 getWorkspaceFolder(): like.Uri|null,
 getFs(): like.FileSystem
 getFsFromCwd(): like.FileSystemLike<string>
}

export const NullShellEnv = {
    setPrompt: () => {},
    getCurrentWorkingDirectory: () => '/',
    getDimensions: () => ({cols: 0, rows: 0}),
    setEnvironmentVariable: <T>(key: string, val: T) => {},
    getEnvironmentVariable: <T>(name: string) => '' as T,
    onError: (error: Error) => console.error(error),
    print: (message: string) => console.log(message),
    printLine: (message: string) => console.log(message),
    printList: (messages: string[]) => messages.forEach(message => console.log(message))
}
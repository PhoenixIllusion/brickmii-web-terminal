'use strict';

import * as vscode from 'vscode';
import { WebFileSystemProvider } from './filesystem/provider';
import { AutoComplete } from './local-echo/local-echo';
import { NavShell } from './nav-shell';
import { Terminal } from './term';
import { PtyTerminal } from './term/pty-terminal';
import XtermJSShell, { type Command, type SubShell } from './xterm-shell';

const configureShell = (term: XtermJSShell) => {

  new NavShell(term);
  term.command('help', async (shell) => {
    await shell.printLine(`
Try running one of these commands:
${shell.commands.map((command) => ` - ${command}`).join('\n')}

`)
  });
}
export interface ExtensionShellInterface {
  commands: {
    [command:string]: {fn: Command, autoComplete?: AutoComplete}
  }
  setFileSystemProvider(provider: WebFileSystemProvider): void;
}

export class WebExtensionShell {

  private term: Terminal & vscode.Pseudoterminal;
  private shell: XtermJSShell;


  constructor() {
    const term = new PtyTerminal();
    this.term = term;
    term.onOpen(this.onOpen.bind(this))
    term.onClose(this.onClose.bind(this))

    this.shell = new XtermJSShell(term);
    configureShell(this.shell);
  }

  onOpen() {
    this.shell.repl();
    console.log("Term Opened");
  }

  onClose() {
    this.shell.abortRead("Terminal Closed");
    console.log("Term Closed");
  }

  getPTY(): vscode.Pseudoterminal {
    return this.term;
  }

} 

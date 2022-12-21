'use strict';

import * as vscode from 'vscode';

import { AutoComplete } from './local-echo/local-echo';
import { NavShell } from './nav-shell';
import { Terminal } from './term';
import { PtyTerminal } from './term/pty-terminal';
import XtermJSShell, { type Command, type SubShell } from './xterm-shell';

const configureShell = (term: XtermJSShell) => {

  term.command('help', async (shell) => {
    await shell.printLine(`
Try running one of these commands:
${shell.commands.map((command) => ` - ${command}`).join('\n')}

`)
  });
}

const addShellCommands = (shell: XtermJSShell, extensionC: ExtensionShellConstructor) => {
  const extension = new extensionC(shell);
  const commands = extension.getCommands();
  Object.entries(commands).forEach( ([command, cmd]) => {
    shell.command(command, cmd.fn, cmd.autoComplete);
  })
}

export interface ExtensionShellCommands {
  [command:string]: {fn: Command, autoComplete?: AutoComplete}
}
export interface ExtensionShellConstructor {
  new(shell: XtermJSShell): ExtensionShellInterface;
}
export interface ExtensionShellInterface {
  getCommands():ExtensionShellCommands;
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
    addShellCommands(this.shell, NavShell);
    configureShell(this.shell);
  }

  onOpen() {
    this.shell.repl();
    console.log("Term Opened");

    vscode.extensions.all.forEach(async ext => {
      if(ext.id.startsWith('brickmii.web-terminal.')) {
        const extension = vscode.extensions.getExtension(ext.id);
        if(extension) {
          if(!extension.isActive) {
            await extension.activate();
          }
          const extensionClass = extension.exports as ExtensionShellConstructor;
          if(extensionClass && extensionClass.prototype.constructor) {
            addShellCommands(this.shell, extensionClass);
          }
        }
      }
    })
  }

  onClose() {
    this.shell.abortRead("Terminal Closed");
    console.log("Term Closed");
  }

  getPTY(): vscode.Pseudoterminal {
    return this.term;
  }

} 

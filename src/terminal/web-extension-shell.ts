'use strict';

import * as vscode from 'vscode';
import { ExtensionShellConstructor, VSShellEnv } from './ext';
import { VSShell } from "./vs-shell";

import { NavShell } from './nav-shell';
import { Terminal } from './term';
import { PtyTerminal } from './term/pty-terminal';

const configureShell = (term: VSShell) => {

  term.command('help', async (shell: VSShellEnv) => {
    await shell.printLine(`
Try running one of these commands:
${[... term.commands.entries()].map(([command, fn]) => ` - ${command}`).join('\n')}

`)
  });
}

const addShellCommands = (shell: VSShell, extensionC: ExtensionShellConstructor) => {
  const extension = new extensionC(shell.getShellEnv());
  const commands = extension.getCommands();
  Object.entries(commands).forEach( ([command, cmd]) => {
    shell.command(command, cmd.fn, cmd.autoComplete);
  })
}


export class WebExtensionShell {

  private term: Terminal & vscode.Pseudoterminal;
  private shell: VSShell;


  constructor() {
    const term = new PtyTerminal();
    this.term = term;
    term.onOpen(this.onOpen.bind(this))
    term.onClose(this.onClose.bind(this))

    this.shell = new VSShell(term);
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
          const extensionClass: ExtensionShellConstructor = await extension.exports as ExtensionShellConstructor;
          if(extensionClass && extensionClass.constructor) {
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

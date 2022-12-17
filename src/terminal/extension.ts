'use strict';

import * as vscode from 'vscode';
import { WebExtensionShell } from './web-extension-shell';

export function activate(context: vscode.ExtensionContext) {
	let NEXT_TERM_ID = 1;


	// vscode.window.createTerminal
	context.subscriptions.push(vscode.commands.registerCommand('brickmii-web-terminal.createTerminal', () => {
		const writeEmitter = new vscode.EventEmitter<string>();
		const options: vscode.ExtensionTerminalOptions = {
			name: 'BrickMii Terminal',
			pty: new WebExtensionShell()
		}
		const terminal = vscode.window.createTerminal(options);
		if (terminal) {
			terminal.show();
		}
	}));

}

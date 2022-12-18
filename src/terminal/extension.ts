'use strict';

import * as vscode from 'vscode';
import { WebExtensionShell } from './web-extension-shell';

export function activate(context: vscode.ExtensionContext) {

	vscode.window.registerTerminalProfileProvider('brickmii.terminal-profile', { 
		provideTerminalProfile: (
			token: vscode.CancellationToken
		): vscode.ProviderResult<{options: vscode.TerminalOptions|vscode.ExtensionTerminalOptions}> => {
			return {options: {
				name: 'BrickMii Terminal',
				pty: new WebExtensionShell().getPTY(),
			}}
		}}
	)

}

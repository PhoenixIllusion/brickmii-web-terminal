'use strict';

import * as vscode from 'vscode';
import { Disposable, OnTerminalDataEvent, OnTerminalResizeEvent, Terminal, TerminalAddon, TerminalDimensions } from './index';

export class PtyTerminal implements vscode.Pseudoterminal, Terminal {
  onDidWrite: vscode.Event<string>;
  private writeEmitter = new vscode.EventEmitter<string>();

  
  private _onData: vscode.EventEmitter<string>;
  private _onResize: vscode.EventEmitter<TerminalDimensions>;
  private _onOpen: vscode.EventEmitter<void>;
  private _onClose: vscode.EventEmitter<void>;
  private _dimensions: vscode.TerminalDimensions|undefined;

  private _disposables: Disposable[] = [];

  constructor() {
    this.onDidWrite = this.writeEmitter.event;
    this._onData = new vscode.EventEmitter<string>();
    this._onOpen = new vscode.EventEmitter<void>();
    this._onClose = new vscode.EventEmitter<void>();
    this._onResize = new vscode.EventEmitter<TerminalDimensions>();
  }

  write(message: string): void {
    this.writeEmitter.fire(message);
  }
  onData(callback: OnTerminalDataEvent): Disposable {
    return this._onData.event(callback, null, this._disposables);
  }
  onResize(callback: OnTerminalResizeEvent): Disposable {
    return this._onResize.event(callback, null, this._disposables);
  }
  onOpen(callback: () => void) {
    this._onOpen.event(callback, null, this._disposables);
  }
  onClose(callback: () => void) {
    this._onClose.event(callback, null, this._disposables);
  }

  loadAddon(addon: TerminalAddon): void {
    if(addon) {
      addon.activate(this);
    }
  }

  get cols(): number {
    if(this._dimensions) {
      return this._dimensions.columns;
    }
    return 0;
  }
  get rows(): number {
    if(this._dimensions) {
      return this._dimensions.rows;
    }
    return 0;
  }

  open(initialDimensions: vscode.TerminalDimensions | undefined): void {
    if(initialDimensions) {
      this.setDimensions(initialDimensions);
    }
    this._onOpen.fire();
  }

  handleInput(data: string) {
    this._onData.fire(data);
  }

  setDimensions(dimensions: vscode.TerminalDimensions) {
    if(dimensions) {
      this._dimensions = dimensions;
    }
    this._onResize.fire({cols: dimensions.columns, rows: dimensions.rows})
  }

  close(): void {
    this._disposables.forEach(disposable => disposable.dispose());
    this._onClose.fire();
  }
  
} 
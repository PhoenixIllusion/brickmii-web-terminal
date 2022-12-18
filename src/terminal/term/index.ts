export interface TerminalDimensions {
  cols: number,
  rows: number
}
export type OnTerminalDataEvent = (message: string)=>void;
export type OnTerminalResizeEvent = (dimensions: TerminalDimensions)=>void;

export interface TerminalAddon extends Disposable{
  activate(terminal: Terminal): void;
}

export interface Disposable {
  dispose: () => void;
}

export interface Terminal extends TerminalDimensions {
  on?(event: 'data', callback: OnTerminalDataEvent): void;
  on?(event: 'resize', callback: OnTerminalResizeEvent): void;
  off?(event: 'data', callback: OnTerminalDataEvent): void;
  off?(event: 'resize', callback: OnTerminalResizeEvent): void;
  write: (message: string)=> void;
  onData?(callback: OnTerminalDataEvent):Disposable;
  onResize?(callback: OnTerminalResizeEvent):Disposable;

  loadAddon?(addon: TerminalAddon): void;
}

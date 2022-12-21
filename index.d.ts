declare module 'brickmii.web-terminal/assemblyscript/extension' {

}
declare module 'brickmii.web-terminal/async-blocker-atomics/filesystem/sync-contract' {
  import { EventEmitter, FileStat, FileType, GlobPattern, Uri } from "vscode";
  export interface FileSystemEvent {
      type: "create" | "change" | "delete";
      uri: Uri;
  }
  export interface SyncContract {
      stat(uri: Uri): FileStat;
      readDirectory(uri: Uri): [string, FileType][];
      createDirectory(uri: Uri): void;
      readFile(uri: Uri): Uint8Array;
      writeFile(uri: Uri, content: Uint8Array): void;
      delete(uri: Uri, options?: {
          recursive?: boolean;
          useTrash?: boolean;
      }): void;
      rename(source: Uri, target: Uri, options?: {
          overwrite?: boolean;
      }): void;
      copy(source: Uri, target: Uri, options?: {
          overwrite?: boolean;
      }): void;
      createFileSystemWatcher(globPattern: GlobPattern, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): EventEmitter<FileSystemEvent>;
  }

}
declare module 'brickmii.web-terminal/async-blocker-atomics/filesystem/sync-filesystem' {
  import { SyncContract } from "brickmii.web-terminal/async-blocker-atomics/filesystem/sync-contract";
  import { ContractConsumer, ExtractFunctions } from "brickmii.web-terminal/async-blocker-atomics/filesystem/worker-contract";
  import SyncWorker from 'brickmii.web-terminal/async-blocker-atomics/filesystem/sync-filesystem.worker';
  export const SetupSyncFileSystem: (bufferSize: number) => {
      consumer: ContractConsumer<ExtractFunctions<SyncContract>>;
      proxy: ExtractFunctions<SyncContract>;
      worker: SyncWorker;
      sharedBuffer: SharedArrayBuffer;
  };

}
declare module 'brickmii.web-terminal/async-blocker-atomics/filesystem/sync-filesystem.worker' {
  export default class WebpackWorker extends Worker {
      constructor();
  }

}
declare module 'brickmii.web-terminal/async-blocker-atomics/filesystem/worker-contract' {
  import { EventEmitter } from "vscode";
  export class JsonSerialized<T> {
      private json;
      obj: T;
      constructor(json: string);
      get(): T;
      toJson(): string;
      static fromSerializable<T>(obj: T): JsonSerialized<T>;
  }
  type ValidKey = number | symbol | string;
  type FunctionAny = (...args: any[]) => any;
  type PureFunction = {
      [key: ValidKey]: FunctionAny | never;
  };
  export type ExtractFunctions<Type> = {
      [Property in keyof Type]: Extract<Type[Property], FunctionAny>;
  };
  type TypedFunction<T extends FunctionAny, U> = (...args: Parameters<T>) => U;
  type ContractTypeReturnType<ReturnType> = ReturnType extends EventEmitter<any> ? Promise<void> : ReturnType extends (Uint8Array | void) ? Promise<ReturnType> : Promise<JsonSerialized<ReturnType>>;
  type ContractTypeFunctions<T extends FunctionAny> = TypedFunction<T, ContractTypeReturnType<ReturnType<T>>>;
  export type ContractTypeAsPromises<Type extends PureFunction> = {
      [Property in keyof Type]: ContractTypeFunctions<Type[Property]>;
  };
  type ContractInvoke<Type> = {
      [Key in keyof ExtractFunctions<Type>]: {
          func: Key;
          args: Parameters<ExtractFunctions<Type>[Key]>;
      };
  }[keyof ExtractFunctions<Type>];
  export class ContractProducer<T> {
      private producer;
      private lock;
      private textEncoder;
      private atomic;
      private data;
      constructor(producer: ContractTypeAsPromises<ExtractFunctions<T>>, lock: SharedArrayBuffer);
      private ping;
      onMessage(event: MessageEvent<ContractInvoke<T>>): Promise<void>;
      sendBufferResult(buffer: Uint8Array): Promise<void>;
      sendJsonResult(result: JsonSerialized<any>): void;
  }
  export class ContractConsumer<T extends PureFunction> implements ProxyHandler<T> {
      private lock;
      private postMessage;
      private textDecoder;
      private atomic;
      private data;
      constructor(lock: SharedArrayBuffer, postMessage: (message: any, options?: StructuredSerializeOptions | undefined) => void);
      getProxy(): T;
      _postMessage(data: {
          func: string | symbol;
          args: any;
      }): void;
      buffer(): Uint8Array;
      concatBuffers(buffers: Uint8Array[]): Uint8Array;
      get(target: T, p: string | symbol, receiver: any): (...args: any[]) => Uint8Array | JsonSerialized<unknown> | undefined;
  }
  export {};

}
declare module 'brickmii.web-terminal/lib-src/typescript/index' {
  export { System, matchFiles, ParseConfigFileHost, ParsedCommandLine, DiagnosticReporter, CompilerOptions, WatchOptions, Map, ExtendedConfigCacheEntry, getParsedCommandLineOfConfigFile, FormatDiagnosticsHost, Diagnostic, flattenDiagnosticMessageText, ExitStatus, parseCommandLine, findConfigFile, createSolutionBuilderHost, createEmitAndSemanticDiagnosticsBuilderProgram, BuildOptions, createSolutionBuilder } from "typescript";

}
declare module 'brickmii.web-terminal/terminal/extension' {
  import * as vscode from 'vscode';
  export function activate(context: vscode.ExtensionContext): void;

}
declare module 'brickmii.web-terminal/terminal/filesystem/fast-glob' {
  import 'setimmediate';
  import FG from 'fast-glob';
  import * as vscode from 'vscode';
  export const fastGlob: (workspace: vscode.WorkspaceFolder) => {
      fasGlob: (source: string | string[], options?: FG.Options) => Promise<string[]>;
      fs: Partial<import("@nodelib/fs.scandir").FileSystemAdapter>;
      uriFromPath: (path: string) => vscode.Uri;
      workspace: vscode.WorkspaceFolder;
  };

}
declare module 'brickmii.web-terminal/terminal/filesystem/mem-fs' {
  import * as vscode from 'vscode';
  export interface MemFsLoader {
      loadFromGlob: (pattern: string | string[]) => Promise<void>;
  }
  export const createMemFsLoader: (fromDir: vscode.WorkspaceFolder) => MemFsLoader;

}
declare module 'brickmii.web-terminal/terminal/local-echo/HistoryController' {
  /**
   * The history controller provides an ring-buffer
   */
  export class HistoryController {
      private size;
      entries: string[];
      cursor: number;
      constructor(size: number);
      /**
       * Push an entry and maintain ring buffer size
       */
      push(entry: string): void;
      /**
       * Rewind history cursor on the last entry
       */
      rewind(): void;
      /**
       * Returns the previous entry
       */
      getPrevious(): string;
      /**
       * Returns the next entry
       */
      getNext(): string;
  }

}
declare module 'brickmii.web-terminal/terminal/local-echo/Utils' {
  import { AutoCompleteEntry } from 'brickmii.web-terminal/terminal/local-echo/local-echo';
  /**
   * Detects all the word boundaries on the given input
   */
  export function wordBoundaries(input: string, leftSide?: boolean): number[];
  /**
   * The closest left (or right) word boundary of the given input at the
   * given offset.
   */
  export function closestLeftBoundary(input: string, offset: number): number;
  export function closestRightBoundary(input: string, offset: number): number;
  /**
   * Convert offset at the given input to col/row location
   *
   * This function is not optimized and practically emulates via brute-force
   * the navigation on the terminal, wrapping when they reach the column width.
   */
  export function offsetToColRow(input: string, offset: number, maxCols: Number): {
      row: number;
      col: number;
  };
  /**
   * Counts the lines in the given input
   */
  export function countLines(input: string, maxCols: number): number;
  /**
   * Checks if there is an incomplete input
   *
   * An incomplete input is considered:
   * - An input that contains unterminated single quotes
   * - An input that contains unterminated double quotes
   * - An input that ends with "\"
   * - An input that has an incomplete boolean shell expression (&& and ||)
   * - An incomplete pipe expression (|)
   */
  export function isIncompleteInput(input: string): boolean;
  /**
   * Returns true if the expression ends on a tailing whitespace
   */
  export function hasTailingWhitespace(input: string): boolean;
  /**
   * Returns the last expression in the given input
   */
  export function getLastToken(input: string): string;
  /**
   * Returns the auto-complete candidates for the given input
   */
  export function collectAutocompleteCandidates(callbacks: AutoCompleteEntry[], input: string): string[];
  export function getSharedFragment(fragment: string, candidates: string[]): string | null;

}
declare module 'brickmii.web-terminal/terminal/local-echo/local-echo' {
  import { Terminal, TerminalDimensions } from "brickmii.web-terminal/terminal/term/index";
  import { HistoryController } from "brickmii.web-terminal/terminal/local-echo/HistoryController";
  export type AutoComplete = (index: number, args: string[], ...argv: any[]) => any;
  export interface AutoCompleteEntry {
      fn: AutoComplete;
      args: any[];
  }
  export interface LocalEchoOptions {
      historySize?: number;
      maxAutocompleteEntries?: number;
  }
  export class LocalEchoController {
      private _autocompleteHandlers;
      private _active;
      private _input;
      private _cursor;
      private _activePrompt;
      private _activeCharPrompt;
      private _termSize;
      private _disposables;
      history: HistoryController;
      maxAutocompleteEntries: number;
      term: Terminal | null;
      private _handleTermData;
      private _handleTermResize;
      constructor(term?: Terminal | null, options?: LocalEchoOptions);
      activate(term: Terminal): void;
      dispose(): void;
      /**
       *  Detach the controller from the terminal
       */
      detach(): void;
      /**
       * Attach controller to the terminal, handling events
       */
      attach(): void;
      /**
       * Register a handler that will be called to satisfy auto-completion
       */
      addAutocompleteHandler(fn: AutoComplete, ...args: any[]): void;
      /**
       * Remove a previously registered auto-complete handler
       */
      removeAutocompleteHandler(fn: AutoComplete): void;
      /**
       * Return a promise that will resolve when the user has completed
       * typing a single line
       */
      read(prompt: string, continuationPrompt?: string): Promise<string>;
      /**
       * Return a promise that will be resolved when the user types a single
       * character.
       *
       * This can be active in addition to `.read()` and will be resolved in
       * priority before it.
       */
      readChar(prompt: string): Promise<string>;
      /**
       * Abort a pending read operation
       */
      abortRead(reason?: string): void;
      /**
       * Prints a message and changes line
       */
      println(message: string): void;
      /**
       * Prints a message and properly handles new-lines
       */
      print(message: string): void;
      /**
       * Prints a list of items using a wide-format
       */
      printWide(items: string[], padding?: number): void;
      /**
       * Apply prompts to the given input
       */
      applyPrompts(input: string): string;
      /**
       * Advances the `offset` as required in order to accompany the prompt
       * additions to the input.
       */
      applyPromptOffset(input: string, offset: number): number;
      /**
       * Clears the current prompt
       *
       * This function will erase all the lines that display the current prompt
       * and move the cursor in the beginning of the first line of the prompt.
       */
      clearInput(): void;
      /**
       * Replace input with the new input given
       *
       * This function clears all the lines that the current input occupies and
       * then replaces them with the new input.
       */
      setInput(newInput: string, clearInput?: boolean): void;
      /**
       * This function completes the current input, calls the given callback
       * and then re-displays the prompt.
       */
      printAndRestartPrompt(callback: () => void | Promise<any>): void;
      /**
      * Set the new cursor position, as an offset on the input string
      *
      * This function:
      * - Calculates the previous and current
      */
      setCursor(newCursor: number): void;
      /**
      * Move cursor at given direction
      */
      handleCursorMove(dir: number): void;
      /**
       * Erase a character at cursor location
       */
      handleCursorErase(backspace: boolean): void;
      /**
      * Insert character at cursor location
      */
      handleCursorInsert(data: string): void;
      /**
       * Handle input completion
       */
      handleReadComplete(): void;
      handleTermResize(size: TerminalDimensions): void;
      /**
       * Handle terminal input
       */
      handleTermData(data: string): void;
      /**
       * Handle a single piece of information from the terminal.
       */
      handleData(data: string): void;
  }

}
declare module 'brickmii.web-terminal/terminal/nav-shell/index' {
  import * as vscode from 'vscode';
  import XtermJSShell, { SubShell } from 'brickmii.web-terminal/terminal/xterm-shell/index';
  import { ExtensionShellCommands, ExtensionShellInterface } from 'brickmii.web-terminal/terminal/web-extension-shell';
  export class NavShell implements ExtensionShellInterface {
      protected term: XtermJSShell;
      CWD: string[];
      get workspace(): vscode.WorkspaceFolder | null;
      constructor(term: XtermJSShell);
      private updateENV;
      private path;
      ls(shell: SubShell, args: any, flags?: any): Promise<void>;
      pwd(shell: SubShell): Promise<void>;
      cd(shell: SubShell, args: any, flags?: any): Promise<void>;
      getCommands(): ExtensionShellCommands;
  }

}
declare module 'brickmii.web-terminal/terminal/term/index' {
  export interface TerminalDimensions {
      cols: number;
      rows: number;
  }
  export type OnTerminalDataEvent = (message: string) => void;
  export type OnTerminalResizeEvent = (dimensions: TerminalDimensions) => void;
  export interface TerminalAddon extends Disposable {
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
      write: (message: string) => void;
      onData?(callback: OnTerminalDataEvent): Disposable;
      onResize?(callback: OnTerminalResizeEvent): Disposable;
      loadAddon?(addon: TerminalAddon): void;
  }

}
declare module 'brickmii.web-terminal/terminal/term/pty-terminal' {
  import * as vscode from 'vscode';
  import { Disposable, OnTerminalDataEvent, OnTerminalResizeEvent, Terminal, TerminalAddon } from 'brickmii.web-terminal/terminal/term/index';
  export class PtyTerminal implements vscode.Pseudoterminal, Terminal {
      onDidWrite: vscode.Event<string>;
      private writeEmitter;
      private _onData;
      private _onResize;
      private _onOpen;
      private _onClose;
      private _dimensions;
      private _disposables;
      constructor();
      write(message: string): void;
      onData(callback: OnTerminalDataEvent): Disposable;
      onResize(callback: OnTerminalResizeEvent): Disposable;
      onOpen(callback: () => void): void;
      onClose(callback: () => void): void;
      loadAddon(addon: TerminalAddon): void;
      get cols(): number;
      get rows(): number;
      open(initialDimensions: vscode.TerminalDimensions | undefined): void;
      handleInput(data: string): void;
      setDimensions(dimensions: vscode.TerminalDimensions): void;
      close(): void;
  }

}
declare module 'brickmii.web-terminal/terminal/web-extension-shell' {
  import * as vscode from 'vscode';
  import { AutoComplete } from 'brickmii.web-terminal/terminal/local-echo/local-echo';
  import XtermJSShell, { type Command } from 'brickmii.web-terminal/terminal/xterm-shell/index';
  export interface ExtensionShellCommands {
      [command: string]: {
          fn: Command;
          autoComplete?: AutoComplete;
      };
  }
  export interface ExtensionShellConstructor {
      new (shell: XtermJSShell): ExtensionShellInterface;
  }
  export interface ExtensionShellInterface {
      getCommands(): ExtensionShellCommands;
  }
  export class WebExtensionShell {
      private term;
      private shell;
      constructor();
      onOpen(): void;
      onClose(): void;
      getPTY(): vscode.Pseudoterminal;
  }

}
declare module 'brickmii.web-terminal/terminal/xterm-shell/index' {
  import { type AutoComplete, LocalEchoController } from 'brickmii.web-terminal/terminal/local-echo/local-echo';
  import { Terminal } from 'brickmii.web-terminal/terminal/term/index';
  export type CommandLineFlags = {
      [key: string]: string;
  };
  export type Command = (shell: SubShell, args: any, flags?: CommandLineFlags) => Promise<void>;
  interface CommandItem {
      command: string;
      fn?: Command;
      autocomplete?: AutoComplete;
  }
  export default class XtermJSShell {
      term: Terminal;
      echo: LocalEchoController;
      prompt: () => Promise<string>;
      commands: Map<string, CommandItem>;
      env: {
          [key: string]: any;
      };
      attached: boolean;
      rows: number;
      cols: number;
      constructor(term: Terminal);
      /**
       * Detach the shell from xtermjs
       */
      detach(): void;
      /**
       * Attach the shell to the terminal
       */
      attach(): void;
      /**
       * Utility for doing colors
       * @return {object} The foreground instance of [ansi-colors](https://github.com/chalk/ansi-styles)
       */
      get color(): import("ansi-styles").ColorBase & import("ansi-styles").ForegroundColor;
      get bgColor(): import("ansi-styles").ColorBase & import("ansi-styles").BackgroundColor;
      /**
       * Read-eval-print-loop, run this to start the shell
       * @return {Promise} Resolves after a pass of the loop finishes
       */
      repl(): Promise<void>;
      /**
       * Run a command in the shell
       * @param  {string}         command The name of the command to run
       * @param  {Array<string>}  args    The list of command arguments to run
       * @return {Promise}                Resolves after the command has finished
       */
      run(command: string, args: string[], flags: any): Promise<void>;
      /**
       * Add a command to the shell
       * @param  {string}        command The name of the command
       * @param  {Command}      fn      Async function that takes a shell / args
       * @return {XtermJSShell}          Returns self for chaining
       */
      command(command: string, fn?: Command, autocomplete?: AutoComplete): XtermJSShell;
      autoCompleteCommands(index: number, tokens: string[]): any;
      readChar(message: string): Promise<string>;
      readLine(message: string): Promise<string>;
      abortRead(reason: string): void;
      print(message: string): void;
      printLine(message: string): void;
      printList(list: string[]): void;
  }
  export class SubShell {
      shell: XtermJSShell;
      destroyed: boolean;
      constructor(shell: XtermJSShell);
      readChar(message: string): Promise<string>;
      readLine(message: string): Promise<string>;
      abortRead(reason: string): Promise<void>;
      print(message: string): Promise<void>;
      printLine(message: string): Promise<void>;
      printList(list: string[]): Promise<void>;
      get color(): import("ansi-styles").ColorBase & import("ansi-styles").ForegroundColor;
      get bgColor(): import("ansi-styles").ColorBase & import("ansi-styles").BackgroundColor;
      get commands(): string[];
      get env(): {
          [key: string]: any;
      };
      get cols(): number;
      get rows(): number;
      checkDestroyed(): void;
      destroy(): void;
  }
  export {};

}
declare module 'brickmii.web-terminal/typescript/extension' {
  import * as vscode from 'vscode';
  import { ExtensionShellConstructor } from 'brickmii.web-terminal/terminal/web-extension-shell';
  export function activate(context: vscode.ExtensionContext): Promise<ExtensionShellConstructor>;

}
declare module 'brickmii.web-terminal/typescript/typescript/index' {
  import * as ts from 'brickmii.web-terminal/lib-src/typescript/index';
  import XtermJSShell from "brickmii.web-terminal/terminal/xterm-shell/index";
  export const createSystem: (term: XtermJSShell, args: string[]) => ts.System;
  export const parseTsConfig: (sys: ts.System) => ts.ParsedCommandLine;
  export const compileTsProject: (sys: ts.System, parsedConfig: ts.ParsedCommandLine) => void;

}
declare module 'brickmii.web-terminal/typescript/typescript/src/sys' {
  import * as ts from 'brickmii.web-terminal/lib-src/typescript/index';
  import XtermJSShell from "brickmii.web-terminal/terminal/xterm-shell/index";
  interface PrivateSystemVals {
      getEnvironmentVariable(name: string): string;
      cpuProfilingEnabled(): boolean;
      debugMode: boolean;
  }
  export const ExtensionTypescriptSystem: (term: XtermJSShell) => ts.System & PrivateSystemVals;
  export {};

}
declare module 'brickmii.web-terminal' {
  import main = require('brickmii');
  export = main;
}
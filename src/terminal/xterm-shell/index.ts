'use strict';

/*
  Modified from https://github.com/RangerMauve/xterm-js-shell
*/
import style from 'ansi-styles';
import stringToArgv from 'string-to-argv';
import minimist, { ParsedArgs } from 'minimist';
import { type AutoComplete, LocalEchoController } from '../local-echo/local-echo'
import { Terminal } from '../term';


export interface ShellEnv {
  setPrompt(prompt: ()=>Promise<string>): void;
  getEnvironmentVariable<T>(name: string): T;
  setEnvironmentVariable<T>(name: string, val: T): void;
  getCurrentWorkingDirectory(): string;
  printLine(message: string): void;
  printList(list: string[]): void;
  print(message: string): void;
  onError(error: Error): void;
  getDimensions(): {cols: number, rows: number}
}

export type Command<T extends ShellEnv> = (env: T, args: any, flags?: ParsedArgs) => Promise<void>;

const ERROR_NOT_FOUND = (command: string) => `Command Not Found: ${command}`
const ERROR_ALREADY_REGISTERED = (command: string) => `Command Already Registered: ${command}`

interface CommandItem<T extends ShellEnv> {
  command: string;
  fn?: Command<T>;
  autocomplete?: AutoComplete
}

export interface ShellEnvFactory<T extends ShellEnv> {
  createShellEnv(shell: ShellEnv):  T
}

export default class XtermJSShell<T extends ShellEnv> {
  term: Terminal;
  echo: LocalEchoController;
  prompt:()=>Promise<string>;
  commands:Map<string,CommandItem<T>>;
  env: {[key: string]:any};
  attached:boolean;

  rows: number = 0;
  cols: number = 0;

  constructor (term: Terminal, private envGen: ShellEnvFactory<T>) {
    this.prompt = async () => '$ '
    this.commands = new Map();
    this.echo = new LocalEchoController(term);
    this.term = term;
    this.env = {};

    this.attached = true;

    this.echo.addAutocompleteHandler(this.autoCompleteCommands.bind(this))
  }

  /**
   * Detach the shell from xtermjs
   */
  detach ():void {
    if (!this.attached) return
    this.echo.detach()
    this.attached = false
  }

  /**
   * Attach the shell to the terminal
   */
  attach ():void {
    if (this.attached) return
    this.echo.attach()
    this.attached = true
  }

  /**
   * Utility for doing colors
   * @return {object} The foreground instance of [ansi-colors](https://github.com/chalk/ansi-styles)
   */
  get color () {
    return style.color
  }

  get bgColor () {
    return style.bgColor
  }

  /**
   * Read-eval-print-loop, run this to start the shell
   * @return {Promise} Resolves after a pass of the loop finishes
   */
  async repl (): Promise<void> {    // Read
    const prompt = await this.prompt()
    const line = await this.echo.read(prompt)

    const argv = stringToArgv(line)

    const command = argv.shift()
    const parsed = minimist(argv)

    const raw_args = parsed._

    try {
      // Eval / Print
      await this.run(command as string, raw_args, parsed)
    } catch (e: any) {
      console.error(e)
      await this.echo.println(e.message)
    }

    // Loop
    this.repl()
  }

  /**
   * Run a command in the shell
   * @param  {string}         command The name of the command to run
   * @param  {Array<string>}  args    The list of command arguments to run
   * @return {Promise}                Resolves after the command has finished
   */
  async run (command: string, args: string[], flags: any): Promise<void> {
    if (!this.commands.has(command)) throw new TypeError(ERROR_NOT_FOUND(command))

    const { fn } = this.commands.get(command) as CommandItem<T>;
    if(fn) {
      const shell = new SubShell(this);
      const result = fn(this.getShellEnv(), args, flags)
      await result;
      shell.destroy()
    }
  }
  getShellEnv() {
    return this.envGen.createShellEnv(this.getEnv());
  }
  private getEnv(): ShellEnv {
    return {
      setPrompt: newPrompt => this.prompt = newPrompt,
      setEnvironmentVariable: <T>(key: string, val: T) => { this.env[key] = val },
      getEnvironmentVariable: <T>(key: string) => this.env[key],
      getCurrentWorkingDirectory: () => this.env['CWD'],
      printLine: (message: string) => this.printLine(message),
      print: (message: string) => this.print(message),
      onError: (error: Error) => this.printLine(error.message),
      getDimensions: () => ({ cols: this.cols, rows: this.rows}),
      printList: (list: string[]) => this.printList(list)
    }
  }

  /**
   * Add a command to the shell
   * @param  {string}        command The name of the command
   * @param  {Command}      fn      Async function that takes a shell / args
   * @return {XtermJSShell}          Returns self for chaining
   */
  command (command: string, fn?: Command<T>, autocomplete?: AutoComplete): XtermJSShell<T> {
    if (this.commands.has(command)) {
      console.warn(ERROR_ALREADY_REGISTERED(command))
    }

    this.commands.set(command, {
      command, fn, autocomplete
    })

    return this
  }

  // Internal command for auto completion of command names
  async autoCompleteCommands (index: number, tokens: string[]) {
    const command = tokens[0]
    if (index === 0) {
      return [...this.commands.keys()].map(key => ({value: key}))
    } else if (this.commands.has(command)) {
      const { autocomplete } = this.commands.get(command) as CommandItem<T>;
      if (!autocomplete) return []
      return autocomplete(index - 1, tokens.slice(1))
    } else {
      return []
    }
  }

  async readChar (message: string): Promise<string> {
    return this.echo.readChar(message)
  }

  async readLine (message: string): Promise<string> {
    return this.echo.read(message)
  }

  abortRead (reason: string): void{
    return this.echo.abortRead(reason)
  }

  print (message: string): void {
    return this.echo.term?.write(message)
  }

  printLine (message: string): void {
    this.echo.println(message)
  }
  printList (list: string[]): void{
    return this.echo.printWide(list)
  }
}
export class SubShell<T extends ShellEnv> {
  shell: XtermJSShell<T>;
  destroyed: boolean;

  constructor (shell: XtermJSShell<T>) {
    this.shell = shell
    this.destroyed = false
  }

  async readChar (message: string) {
    this.checkDestroyed()
    return this.shell.readChar(message)
  }

  async readLine (message: string) {
    this.checkDestroyed()
    return this.shell.readLine(message)
  }

  async abortRead (reason: string) {
    this.checkDestroyed()
    return this.shell.abortRead(reason)
  }

  async print (message: string) {
    this.checkDestroyed()
    this.shell.print(message)
  }

  async printLine (message: string) {
    this.checkDestroyed()
    this.shell.printLine(message)
  }

  async printList (list: string[]) {
    this.checkDestroyed()
    this.shell.printList(list)
  }

  get color () {
    return style.color
  }

  get bgColor () {
    return style.bgColor
  }

  get commands () {
    return [...this.shell.commands.keys()]
  }

  get env () {
    return this.shell.env
  }

  get cols () {
    return this.shell.cols
  }

  get rows () {
    return this.shell.rows
  }

  checkDestroyed () {
    if (this.destroyed) throw new Error('Terminal destroyed')
  }

  destroy () {
    this.destroyed = true
  }
}
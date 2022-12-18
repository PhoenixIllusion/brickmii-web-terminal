import { DirectoryWatcherCallback, FileWatcher, FileWatcherCallback, WatchOptions } from "typescript";


export interface WebFileSystemProvider {
  args: string[];
  newLine: string;
  useCaseSensitiveFileNames: boolean;
  write(s: string): void;
  readFile(path: string, encoding?: string): Promise<string | undefined>;
  getFileSize?(path: string): Promise<number>;
  writeFile(path: string, data: string, writeByteOrderMark?: boolean): Promise<void>;

  /**
   * @pollingInterval - this parameter is used in polling-based watchers and ignored in watchers that
   * use native OS file watching
   */
  watchFile?(path: string, callback: FileWatcherCallback, pollingInterval?: number, options?: WatchOptions): FileWatcher;
  watchDirectory?(path: string, callback: DirectoryWatcherCallback, recursive?: boolean, options?: WatchOptions): FileWatcher;
  resolvePath(path: string): string;
  fileExists(path: string): Promise<boolean>;
  directoryExists(path: string): Promise<boolean>;
  createDirectory(path: string): Promise<void>;
  getExecutingFilePath(): string;
  getCurrentDirectory(): string;
  getDirectories(path: string): Promise<string[]>;
  readDirectory(path: string, extensions?: readonly string[], exclude?: readonly string[], include?: readonly string[], depth?: number): Promise<string[]>;
  getModifiedTime?(path: string): Date | undefined;
  setModifiedTime?(path: string, time: Date): void;
  deleteFile?(path: string): Promise<void>;

  getEnvironmentVariable(val: string): string;
  getWidthOfTerminal(): number;
}

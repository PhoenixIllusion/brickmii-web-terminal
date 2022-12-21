import { EventEmitter, FileStat, FileSystemWatcher, FileType, GlobPattern, Uri } from "vscode";

export interface FileSystemEvent {
  type: "create"|"change"|"delete"
  uri: Uri;
}

export interface SyncContract {
 stat(uri: Uri): FileStat;
 readDirectory(uri: Uri): [string, FileType][];
 createDirectory(uri: Uri): void;
 readFile(uri: Uri): Uint8Array;
 writeFile(uri: Uri, content: Uint8Array): void;
 delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): void;
 rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): void;
 copy(source: Uri, target: Uri, options?: { overwrite?: boolean }): void;
 createFileSystemWatcher(globPattern: GlobPattern, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean): EventEmitter<FileSystemEvent>;
}

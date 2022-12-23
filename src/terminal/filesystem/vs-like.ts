import type { FileStat } from 'vscode'

export interface Uri {
  path: string;
  with(change: {
    scheme?: string;
    authority?: string | null;
    path?: string | null;
    query?: string | null;
    fragment?: string | null;
}): Uri;
}

export enum FileType {
  /**
   * The file type is unknown.
   */
  Unknown = 0,
  /**
   * A regular file.
   */
  File = 1,
  /**
   * A directory.
   */
  Directory = 2,
  /**
   * A symbolic link to a file.
   */
  SymbolicLink = 64
}
export enum FilePermission {
  /**
   * The file is readonly.
   *
   * *Note:* All `FileStat` from a `FileSystemProvider` that is registered with
   * the option `isReadonly: true` will be implicitly handled as if `FilePermission.Readonly`
   * is set. As a consequence, it is not possible to have a readonly file system provider
   * registered where some `FileStat` are not readonly.
   */
  Readonly = 1
}

export interface FileSystem {
  stat(uri: Uri): Thenable<FileStat>;
  readDirectory(uri: Uri): Thenable<[string, FileType][]>;
  readFile(uri: Uri): Thenable<Uint8Array>;
  createDirectory(uri: Uri): Thenable<void>;
  readFile(uri: Uri): Thenable<Uint8Array>;
  writeFile(uri: Uri, content: Uint8Array): Thenable<void>;
}
export interface WorkspaceLike {
  FileType: typeof FileType,
  FilePermission: typeof FilePermission
}
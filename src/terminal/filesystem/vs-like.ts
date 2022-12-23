import type { FileStat } from 'vscode';
import { posix } from 'path';

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
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64
}

export enum FilePermission {
  Readonly = 1
}
export interface FileSystemLike<T> {
  stat(uri: T): Thenable<FileStat>;
  readDirectory(uri: T): Thenable<[string, FileType][]>;
  readFile(uri: T): Thenable<Uint8Array>;
  createDirectory(uri: T): Thenable<void>;
  readFile(uri: T): Thenable<Uint8Array>;
  writeFile(uri: T, content: Uint8Array): Thenable<void>;
}
export interface FileSystem extends FileSystemLike<Uri>{

}
export interface FromCWD {
  fromCWD(): FileSystem;
}

export const WrapFromCWD = (
  context: { withWorkspace: ()=>Uri|null, withCWD: ()=>string},
  filesystem: FileSystemLike<Uri>): FileSystemLike<string> => {
  return new Proxy<FileSystemLike<Uri>>(filesystem, {
    get(target, p: string|symbol, receiver) {
      return (uri: string, ... argv: any[]) => {
        const workspace = context.withWorkspace();
        const cwd = context.withCWD();
        const curPath = workspace?.path;
        const deltaPath = (cwd.length > 0)? cwd: '';
        const path = posix.normalize(posix.join(curPath||'', deltaPath));
        return Reflect.get(target, p)(workspace?.with({path}), ... argv);
      }
    },
  }) as any as FileSystemLike<string>
}
import type { FileStat } from 'vscode';
import { posix } from 'path';
import type { Stats, Dirent, PathLike } from 'fs';

declare type ErrnoException = NodeJS.ErrnoException;
type NoParamCallback = (err: NodeJS.ErrnoException | null) => void;
declare type StatAsyncCallbackDirents = (error: ErrnoException | null, files: Dirent[]) => void;
declare type StatAsyncCallbackStrings = (error: ErrnoException | null, files: string[]) => void;
interface DirentPartial {
  isBlockDevice: () => boolean;
  isCharacterDevice: () => boolean;
  isDirectory: () => boolean;
  isFIFO: () => boolean;
  isFile: () => boolean;
  isSocket: () => boolean;
  isSymbolicLink: () => boolean;
}

enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64
}

enum FilePermission {
  Readonly = 1
}

interface Uri {
  path: string;
  with(change: {
    scheme?: string;
    authority?: string | null;
    path?: string | null;
    query?: string | null;
    fragment?: string | null;
  }): Uri;
}

const StatToDirentPartial = (type: FileType) => {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => (type & FileType.Directory) > 0,
    isFIFO: () => false,
    isFile: () => (type & FileType.File) > 0,
    isSocket: () => false,
    isSymbolicLink: () => (type & FileType.SymbolicLink) > 0
  }
}

const StatToDirent = (name: string, type: FileType): Dirent => {
  return {
    ... StatToDirentPartial(type),
    name
  }
}

const StatPermission = (vsStat: FileStat, dirent: DirentPartial): number => {
  const S_IFLNK = 0x0120000;//   symbolic link
  const S_IFREG = 0x0100000;//   regular file
  const S_IFDIR = 0x0040000;//   directory

  let flag = 0;
  if(dirent.isFile()) {
    flag |= S_IFREG
  }
  if(dirent.isDirectory()){
    flag |= S_IFDIR
  }
  if(dirent.isSymbolicLink()){ 
    flag |= S_IFLNK
  }
  if(vsStat.permissions && vsStat.permissions === FilePermission.Readonly) {
    flag |= 0x4444;
  } else {
    flag |= 0x7777;
  }
  return flag;
}
const MapState = (vsStat: FileStat): Stats => {
  const partial = StatToDirentPartial(vsStat.type);
  return {
    ... partial,
    atime: new Date(vsStat.mtime),
    mtime: new Date(vsStat.mtime),
    ctime: new Date(vsStat.mtime),
    birthtime: new Date(vsStat.ctime),
    dev: 0,
    ino: 0,
    mode: StatPermission(vsStat, partial),
    nlink: 0,
    uid: 0,
    gid: 0,
    rdev: 0,
    size: vsStat.size,
    blksize: 0,
    blocks: 0,
    atimeMs: vsStat.mtime,
    mtimeMs: vsStat.mtime,
    ctimeMs: vsStat.ctime,
    birthtimeMs: vsStat.ctime
  }
}
const NullStat = () => MapState({ mtime: 0, ctime: 0, size: 0, type: 0})

export interface Env {
  cwd: string;
  pwd: string;
  executingFile: string;
  workspace: Uri;
  env: {[key: string]: string};
  fs: FileSystem;
}

export const process = (env: Env) => ({
  chdir: (path: string) => {
    env.cwd = posix.resolve(env.cwd,path);
  },
  cwd:  () => env.cwd
})

export const fs = (env: Env, ) => {

  const proc = process(env); 

  const resolveUrl = (filepath: string): Uri => {
    const dest = posix.resolve(env.cwd,filepath);
    const path = posix.join(env.workspace.path, dest);
    return env.workspace.with({path})
  }

  async function stat(filepath: string, callback: (err: NodeJS.ErrnoException | null, stats: Stats) => void) {
    try {
      const stat = await env.fs.stat(resolveUrl(filepath));
      callback(null, MapState(stat));
    } catch(err: any) {
      callback(err, NullStat())
    }
  };
  async function readdir(filepath: string, callbackOrOptions: StatAsyncCallbackStrings| { withFileTypes: true; }, callback?: StatAsyncCallbackDirents) {
    try {
      const dirEntries = await env.fs.readDirectory(resolveUrl(filepath));
      if(callbackOrOptions instanceof Function) {
        const callback = callbackOrOptions;
        const results = dirEntries.map( entry => {
          const [name, filetype] = entry;
          return name;
        })
        callback && callback(null, results);
      } else {
        const results = dirEntries.map( entry => {
          const [name, filetype] = entry;
          return StatToDirent(name, filetype);
        })
        callback && callback(null, results);
      }
    }catch(err: any) {
      callback && callback(err, [])
    }
  }
  async function mkdir(path: string, callback: NoParamCallback) {
    try {
      await env.fs.createDirectory(resolveUrl(path));
      callback(null)
    } catch(err: any) {
      callback(err);
    }
  }
  async function writeFile(path: string, data: string | Uint8Array, callback: NoParamCallback) {
    try {
      if(data instanceof Uint8Array) {
        await env.fs.writeFile(resolveUrl(path),data);
      } else {
        await env.fs.writeFile(resolveUrl(path),Buffer.from(data));
      }
      callback(null)
    } catch(err: any) {
      callback(err);
    }
  }
  type BufferCallback = (err: NodeJS.ErrnoException | null, data: Buffer) => void;
  type BufferOrStringCallback = (err: NodeJS.ErrnoException | null, data: string | Buffer);
  type EncodingOptions = {encoding?: 'string'}

  async function readFile(path: string, callback: BufferCallback): Promise<void>;
  async function readFile(path: string, options: EncodingOptions, bufferStringCallback: BufferOrStringCallback): Promise<void>;
  async function readFile(path: string, callbackOrOptions: EncodingOptions|BufferCallback, bufferStringCallback?: BufferOrStringCallback ) {
    try {
      const data = await env.fs.readFile(resolveUrl(path));
      if(typeof callbackOrOptions === 'function') {
        callbackOrOptions(null, Buffer.from(data));
      }
      if(bufferStringCallback) {
        if(typeof callbackOrOptions === 'object' && callbackOrOptions.encoding === 'string') {
          bufferStringCallback(null, Buffer.from(data).toString())
        } else {
          bufferStringCallback(null, Buffer.from(data));
        }
      }
    } catch (ex: any) {
      if(typeof callbackOrOptions === 'function') {
        callbackOrOptions(ex, Buffer.from([]));
      }
      if(bufferStringCallback) {
        bufferStringCallback(ex, Buffer.from([]));
      }
    }
  }
  return {
    stat,
    readdir,
    mkdir,
    mkdirp: mkdir,
    writeFile,
    readFile
  }
}

interface FileSystem {

  /**
   * Retrieve metadata about a file.
   *
   * @param uri The uri of the file to retrieve metadata about.
   * @return The file metadata about the file.
   */
  stat(uri: Uri): Thenable<FileStat>;

  /**
   * Retrieve all entries of a {@link FileType.Directory directory}.
   *
   * @param uri The uri of the folder.
   * @return An array of name/type-tuples or a thenable that resolves to such.
   */
  readDirectory(uri: Uri): Thenable<[string, FileType][]>;

  /**
   * Create a new directory (Note, that new files are created via `write`-calls).
   *
   * *Note* that missing directories are created automatically, e.g this call has
   * `mkdirp` semantics.
   *
   * @param uri The uri of the new folder.
   */
  createDirectory(uri: Uri): Thenable<void>;

  /**
   * Read the entire contents of a file.
   *
   * @param uri The uri of the file.
   * @return An array of bytes or a thenable that resolves to such.
   */
  readFile(uri: Uri): Thenable<Uint8Array>;

  /**
   * Write data to a file, replacing its entire contents.
   *
   * @param uri The uri of the file.
   * @param content The new content of the file.
   */
  writeFile(uri: Uri, content: Uint8Array): Thenable<void>;

  /**
   * Delete a file.
   *
   * @param uri The resource that is to be deleted.
   * @param options Defines if trash can should be used and if deletion of folders is recursive
   */
  delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): Thenable<void>;

  /**
   * Rename a file or folder.
   *
   * @param source The existing file.
   * @param target The new location.
   * @param options Defines if existing files should be overwritten.
   */
  rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): Thenable<void>;

  /**
   * Copy files or folders.
   *
   * @param source The existing file.
   * @param target The destination location.
   * @param options Defines if existing files should be overwritten.
   */
  copy(source: Uri, target: Uri, options?: { overwrite?: boolean }): Thenable<void>;

  /**
   * Check if a given file system supports writing files.
   *
   * Keep in mind that just because a file system supports writing, that does
   * not mean that writes will always succeed. There may be permissions issues
   * or other errors that prevent writing a file.
   *
   * @param scheme The scheme of the filesystem, for example `file` or `git`.
   *
   * @return `true` if the file system supports writing, `false` if it does not
   * support writing (i.e. it is readonly), and `undefined` if the editor does not
   * know about the filesystem.
   */
  isWritableFileSystem(scheme: string): boolean | undefined;
}
import process from 'process';
if(!process.versions['node']){
  process.versions['node'] = '10.10';
}
import 'setimmediate';
import FG from 'fast-glob';
import {posix} from 'path';
import type * as fs from 'fs';
import { Buffer } from 'buffer';
import { VSShellEnv } from '../ext';
import * as like from './vs-like';

import type { FileStat } from 'vscode'


declare type Stats = fs.Stats;
interface DirentPartial {
  isBlockDevice: () => boolean;
  isCharacterDevice: () => boolean;
  isDirectory: () => boolean;
  isFIFO: () => boolean;
  isFile: () => boolean;
  isSocket: () => boolean;
  isSymbolicLink: () => boolean;
}
interface Dirent extends DirentPartial{
  name: string;
}
declare type ErrnoException = NodeJS.ErrnoException;
declare type StatAsyncCallbackDirents = (error: ErrnoException | null, files: Dirent[]) => void;
declare type StatAsyncCallbackStrings = (error: ErrnoException | null, files: string[]) => void;
declare type StatAsynchronousMethod = (path: string, callback: (error: ErrnoException | null, stats: Stats) => void) => void;
interface ReaddirAsynchronousMethod {
  (filepath: string, options: { withFileTypes: true; }, callback: StatAsyncCallbackDirents): void;
  (filepath: string, callback: StatAsyncCallbackStrings): void;
}

const StatToDirentPartial = (type: like.FileType) => {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => (type & like.FileType.Directory) > 0,
    isFIFO: () => false,
    isFile: () => (type & like.FileType.File) > 0,
    isSocket: () => false,
    isSymbolicLink: () => (type & like.FileType.SymbolicLink) > 0
  }
}

const StatToDirent = (name: string, type: like.FileType): Dirent => {
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
  if(vsStat.permissions && vsStat.permissions === like.FilePermission.Readonly) {
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


export interface FastGlobFilesystem {
  lstat: StatAsynchronousMethod;
  stat: StatAsynchronousMethod;
  readdir: ReaddirAsynchronousMethod;
  readFile: (path: string) => Promise<string|undefined>;
  writeFile(path: string, contents: string|Uint8Array): Promise<void>;
  createDirectory: (path: string) => Promise<void>;
}

interface FastGlobEnvironmentBase {
  fs: FastGlobFilesystem,
  workspace: like.Uri,
  uriFromPath: (path: string) => like.Uri
}
export interface FastGlobEnvironment extends FastGlobEnvironmentBase {
  fastGlob: (source: string|string[], options?:FG.Options) => Promise<string[]>
}

const VsCodeAsyncFileSystem = (shell: VSShellEnv): FastGlobEnvironmentBase|null => {
  const fs = shell.getFs();
  const workspace = shell.getWorkspaceFolder();
  if (!workspace) {
    return null;
  }
  const uriFromPath = (path: string): like.Uri => {
    return workspace.with({path: posix.normalize(posix.join(workspace.path, path))});
  }
  const stat: StatAsynchronousMethod = async (path: string, callback: (error: ErrnoException | null, stats: Stats) => void) => {
    const newPath = posix.normalize(posix.join(workspace.path, path));
    try {
      const stat = await fs.stat(workspace.with({path: newPath}));
      callback(null, MapState(stat));
    } catch(err: any) {
      callback(err, NullStat())
    }
  }
  const readdir: ReaddirAsynchronousMethod = async (filepath: string, callbackOrOptions: StatAsyncCallbackStrings| { withFileTypes: true; }, callback?: StatAsyncCallbackDirents) => {
    const newPath = posix.normalize(posix.join(workspace.path, filepath));
    try {
      const dirEntries = await fs.readDirectory(workspace.with({path: newPath}));
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
  const readFile = async (path: string): Promise<string|undefined> => {
    try {
      const data = await fs.readFile(uriFromPath(path))
      return Buffer.from(data).toString('utf8');
    } catch {

    }
  }
  async function writeFile(path: string, contents: string|Uint8Array): Promise<void> {
    try {
      if(contents instanceof Uint8Array) {
        await fs.writeFile(uriFromPath(path),contents);
      } else {
        await fs.writeFile(uriFromPath(path),Buffer.from(contents));
      }
    } catch {

    }
  }
  const createDirectory = async (path: string): Promise<void> => {
    try {
      await fs.createDirectory(uriFromPath(path));
    } catch {

    }
  }
  return {
    workspace,
    fs: {
      stat,
      lstat: stat,
      readdir,
      readFile,
      writeFile,
      createDirectory
    },
    uriFromPath
  }
}

export const fastGlob = (shell: VSShellEnv): FastGlobEnvironment => {
  const env: FastGlobEnvironmentBase|null = VsCodeAsyncFileSystem(shell);
  if(!env) {
    throw Error('Workspace Folder Failed to Load')
  }
  return {
    fastGlob: (source: string|string[], options:FG.Options = {}) => {
      return FG(source, {
        ... options,
        fs: env.fs
      })
    },
    ... env
  }
}

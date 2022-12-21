import FG from 'fast-glob';
import {posix} from 'path';
import * as vscode from 'vscode';
import type * as fs from 'fs';

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

const StatToDirentPartial = (type: vscode.FileType) => {
  return {
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isDirectory: () => (type & vscode.FileType.Directory) > 0,
    isFIFO: () => false,
    isFile: () => (type & vscode.FileType.File) > 0,
    isSocket: () => false,
    isSymbolicLink: () => (type & vscode.FileType.SymbolicLink) > 0
  }
}

const StatToDirent = (name: string, type: vscode.FileType): Dirent => {
  return {
    ... StatToDirentPartial(type),
    name
  }
}

const StatPermission = (vsStat: vscode.FileStat, dirent: DirentPartial): number => {
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
  if(vsStat.permissions && vsStat.permissions === vscode.FilePermission.Readonly) {
    flag |= 0x4444;
  } else {
    flag |= 0x7777;
  }
  return flag;
}
const MapState = (vsStat: vscode.FileStat): Stats => {
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


interface FastGlobFilesystem {
  lstat: StatAsynchronousMethod;
  stat: StatAsynchronousMethod;
  readdir: ReaddirAsynchronousMethod;
}
const VsCodeAsyncFileSystem = (workspace: vscode.WorkspaceFolder): FastGlobFilesystem => {
  const stat: StatAsynchronousMethod = async (path: string, callback: (error: ErrnoException | null, stats: Stats) => void) => {
    const newPath = posix.normalize(posix.join(workspace.uri.path, path));
    try {
      const stat = await vscode.workspace.fs.stat(workspace.uri.with({path: newPath}));
      callback(null, MapState(stat));
    } catch(err: any) {
      callback(err, NullStat())
    }
  }
  const readdir: ReaddirAsynchronousMethod = async (filepath: string, callbackOrOptions: StatAsyncCallbackStrings| { withFileTypes: true; }, callback?: StatAsyncCallbackDirents) => {
    const newPath = posix.normalize(posix.join(workspace.uri.path, filepath));
    try {
      const dirEntries = await vscode.workspace.fs.readDirectory(workspace.uri.with({path: newPath}));
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
  return {
    stat,
    lstat: stat,
    readdir
  }
}

export const fastGlob = (workspace: vscode.WorkspaceFolder) => {
  const fs: Partial<FG.FileSystemAdapter> = VsCodeAsyncFileSystem(workspace);
  return {
    fasGlob: (source: string|string[], options:FG.Options = {}) => {
      FG(source, {
        ... options,
        fs
      })
    },
    fs,
    workspace
  }
}

import * as vscode from 'vscode'
import { fastGlob } from './fast-glob'
import { vol } from 'memfs'
import { Buffer } from 'buffer'

export interface MemFsLoader {
  loadFromGlob: (pattern: string|string[]) => Promise<void>
}

export const createMemFsLoader = (fromDir: vscode.WorkspaceFolder): MemFsLoader => {
  const glob = fastGlob(fromDir);
  return {
    loadFromGlob: async (pattern: string|string[]) => {
      const files = await glob.fasGlob(pattern);
      await Promise.all(files.map(async path => {
        const data = await vscode.workspace.fs.readFile(glob.uriFromPath(path))
        vol.fromJSON({[path]: Buffer.from(data).toString('utf8')});
      }));
    }
  }
}
import { fs as FS, vol } from 'memfs'
import { VSShellEnv } from '../ext'
import { fastGlob } from './fast-glob';

export interface MemFsLoader {
  loadFromGlob: (pattern: string|string[]) => Promise<void>,
  fs: typeof FS
}

export const createMemFsLoader = (shell: VSShellEnv): MemFsLoader => {
  const glob = fastGlob(shell);
  return {
    loadFromGlob: async (pattern: string|string[]) => {
      const files = await glob.fastGlob(pattern);
      await Promise.all(files.map(async path => {
        const data = await glob.fs.readFile(path);
        data && vol.fromJSON({[path]: data});
      }));
    },
    fs: FS
  }
}
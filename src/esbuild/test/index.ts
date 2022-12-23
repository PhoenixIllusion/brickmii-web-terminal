import { NullShellEnv, VSShellEnv } from '../../terminal/ext';
import { activate, performEsBuild } from '../extension';
import * as like from '../../terminal/filesystem/vs-like';
import { URI } from 'vscode-uri';
import { Buffer } from 'buffer';
import type { FileStat, FileType } from 'vscode';
import fs from 'fs';
import { fastGlob } from '../../terminal/filesystem/fast-glob';

const workspaceUri = URI.from({scheme: 'file', path: '/'});

const FILES: {[path: string]:string} = {
  '/index.ts' : `import { foo } from './lib/test.ts';console.log(foo);`,
  '/lib/test.ts' : 'export const foo = "Hello World";'
}

const stringToBuffer = (str: string) => Buffer.from(str);

const FakeFS: like.FileSystem = {
  stat: (uri: like.Uri): Thenable<FileStat> => {
    throw new Error('Function not implemented.');
  },
  readDirectory: (uri: like.Uri): Thenable<[string, FileType][]> => {
    throw new Error('Function not implemented.');
  },
  readFile: async (uri: like.Uri): Promise<Uint8Array> => {
    return stringToBuffer(FILES[uri.path]);
  },
  writeFile: async (uri, content): Promise<void> => {
    FILES[uri.path] = Buffer.from(content).toString();
  },
  createDirectory: async (uri): Promise<void> => {
    FILES[uri.path] = '/';
  },
}

const env: VSShellEnv = {
  ... NullShellEnv,
  getWorkspaceFolder: () => workspaceUri,
  getFs: () => FakeFS
}

async function run() {
  const glob = fastGlob(env);
  console.log("Building...");
  const wasmBuffer = fs.readFileSync('src/esbuild/esbuild.0.16.10.wasm');
  const wasmModule = new WebAssembly.Module(wasmBuffer);
  await performEsBuild(env, {_:['index.ts'], sourcemap: true, bundle:true, minify: true, outdir: 'xyz_dist'});
  console.log(FILES);
}


run();

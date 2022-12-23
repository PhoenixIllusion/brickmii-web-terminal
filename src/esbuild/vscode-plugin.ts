import esbuild from 'esbuild-wasm';
import path,{posix} from 'path';
import { FastGlobEnvironment } from '../terminal/filesystem/fast-glob';

export class VsCodePlugin  {
  name: string = "vs-code-plugin";
  constructor(private env: FastGlobEnvironment) {

  }
  async setup(build: esbuild.PluginBuild): Promise<void> {
    build.onStart(this.onStart.bind(this));
    build.onEnd(this.onEnd.bind(this));
    build.onResolve({ filter: /.*/ },this.onResolve.bind(this));
    build.onLoad({ filter: /.*/ }, this.onLoad.bind(this));
  }
  onStart(): esbuild.OnStartResult | null | void | Promise<esbuild.OnStartResult | null | void> {

  }
  async onEnd(result: esbuild.BuildResult): Promise<void> {
    if(result.outputFiles) {
      for(let i=0;i<result.outputFiles.length;i++) {
        const outputFile = result.outputFiles[i];
        await this.env.fs.writeFile(outputFile.path, outputFile.contents)
      }
    }
  }
  async onResolve(args: esbuild.OnResolveArgs): Promise<esbuild.OnResolveResult | null | undefined> {
    if (args.kind === 'entry-point') {
      return { path: posix.join(args.resolveDir, args.path) }
    }
    if (args.kind === 'import-statement') {
      const dirname = posix.dirname(args.importer)
      const path = posix.join(dirname, args.path)
      const exts = "js|ts|mjs|mts"
      const singleFile = await this.env.fastGlob([`${path}.(${exts})`]);
      if(singleFile) {
        return { path: singleFile[0] }
      }
      const folderFile = await this.env.fastGlob([`${path}/index.(${exts}`]);
      if(folderFile) {
        return { path: folderFile[0] }
      }
    }
    throw Error('not resolvable')
  }

  async onLoad(args: esbuild.OnLoadArgs): Promise<esbuild.OnLoadResult | null | undefined> {
    const extname = path.extname(args.path)
    const contents = await this.env.fs.readFile(args.path);
    const loader = extname === '.ts' ? 'ts' : extname === '.tsx' ? 'tsx' : extname === '.js' ? 'js' : extname === '.jsx' ? 'jsx' : 'default'
    return { contents, loader }
  }
  getPlugin(): esbuild.Plugin  {
    return {
      name: this.name,
      setup: this.setup.bind(this)
    }
  }

}
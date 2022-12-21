import ts from "typescript";
import XtermJSShell from "../../../terminal/xterm-shell";
import { fs } from 'memfs'
import _path from 'path';
import Dirent from "memfs/lib/Dirent";
import SHA from 'sha.js'
import { Buffer } from 'buffer'

const useCaseSensitiveFileNames = true;
const newLine = "\r\n"

interface PrivateSystemVals {
  getEnvironmentVariable(name:string): string,
  cpuProfilingEnabled(): boolean,
  debugMode: boolean,

}

export const ExtensionTypescriptSystem = (term: XtermJSShell): ts.System & PrivateSystemVals => {
    const sys: ts.System & PrivateSystemVals = {
        args: process.argv.slice(2),
        newLine,
        useCaseSensitiveFileNames,
        write: (s: string) => term.print(s),
        getWidthOfTerminal: () => term.cols,
        writeOutputIsTTY() {
            return process.stdout.isTTY;
        },
        readFile: (path, encoding) => {try {return fs.readFileSync(path, 'utf8') as string}catch{}},
        writeFile: (path, data) => fs.writeFileSync(path, data),
        resolvePath: path => _path.resolve(path),
        fileExists: (path) => fs.existsSync(path) && fs.statSync(path).isFile(),
        directoryExists: (path) => fs.existsSync(path) && fs.statSync(path).isDirectory(),
        createDirectory: (directoryName: string) => fs.mkdirSync(directoryName),
        getExecutingFilePath: () => term.env['PWD']+'tsc',
        getCurrentDirectory: () => term.env['CWD'],
        getDirectories: (path) => getFileSystemEntries(path).directories.slice(),
        getEnvironmentVariable: (name: string) => term.env[name],
        readDirectory: (path: string, extensions?: readonly string[], excludes?: readonly string[], includes?: readonly string[], depth?: number) => {
            return ts.matchFiles(path, extensions, excludes, includes, useCaseSensitiveFileNames, sys.getCurrentDirectory(), depth, getFileSystemEntries, fs.realpathSync as (path: string)=>string);
        },
        getModifiedTime: (path) => {try {return fs.statSync(path).mtime}catch{}},
        setModifiedTime: (path, time) => fs.utimesSync(path, time, time),
        deleteFile: (path) => fs.rmSync(path),
        createHash: (data: string) => new SHA.sha256().update(data).digest('base64'),
        createSHA256Hash: (data: string) => new SHA.sha256().update(data).digest('base64'),
        getFileSize(path) {
            try {
                const stat = fs.statSync(path);
                if (stat?.isFile()) {
                    return stat.size;
                }
            }
            catch { /*ignore*/ }
            return 0;
        },
        exit(exitCode?: number): void {
            term.print("Exited with code "+exitCode)
        },
        cpuProfilingEnabled: () => false,
        realpath: (path: string) => fs.realpathSync(path) as string,
        debugMode: false,
        setTimeout,
        clearTimeout,
        clearScreen: () => {
            term.print("\x1Bc");
        },

        base64decode: input => Buffer.from(input, "base64").toString("utf8"),
        base64encode: input => Buffer.from(input).toString("base64")
    }
    return sys;
}
interface FileSystemEntries {
  readonly files: readonly string[];
  readonly directories: readonly string[];
}
function getFileSystemEntries(path: string): FileSystemEntries {
    const files: string[] = []
    const directories: string[] = []
    const entries = fs.readdirSync(path, {withFileTypes: true}) as Dirent[];
    for (const entry of entries) {
        if (entry.isFile()) {
            files.push(entry.name as string)
        } else if (entry.isDirectory()) {
            directories.push(entry.name as string)
        }
    }
    return {files, directories}
}

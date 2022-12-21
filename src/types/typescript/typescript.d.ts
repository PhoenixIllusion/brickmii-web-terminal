import * as ts from 'typescript'
declare module 'typescript' {
    function matchFiles(path: string, extensions: readonly string[] | undefined, excludes: readonly string[] | undefined, includes: readonly string[] | undefined, useCaseSensitiveFileNames: boolean, currentDirectory: string, depth: number | undefined, getFileSystemEntries: (path: string) => FileSystemEntries, realpath: (path: string) => string): string[] 

    export interface FileSystemEntries {
        files: ReadonlyArray<string>
        directories: ReadonlyArray<string>
    }

    export interface JsonSourceFile extends ts.SourceFile {
        parseDiagnostics: ts.Diagnostic[]
    }
    export function getNewLineCharacter(options: ts.CompilerOptions | ts.PrinterOptions): string
}
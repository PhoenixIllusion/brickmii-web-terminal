import * as ts from 'typescript';
import _path from 'path'
import type { fs as FS } from 'memfs';
import { ExtensionTypescriptSystem } from "./src/sys";
import { VSShellEnv } from '../../terminal/ext';

export const createSystem = (term: VSShellEnv, args: string[], fs: typeof FS): ts.System => {
  const sys = ExtensionTypescriptSystem(term, fs);
  sys.args = args;
  return sys
}

const getParsedConfig = (configPath: string, commandLine: ts.ParsedCommandLine, reportDiagnostic: ts.DiagnosticReporter, sys: ts.System): ts.ParsedCommandLine|undefined => {
  const host: ts.ParseConfigFileHost = sys as any;
  host.onUnRecoverableConfigFileDiagnostic = (diagnostic) => reportDiagnostic(diagnostic);
  const optionsToExtend: ts.CompilerOptions | undefined = commandLine.options;
  const watchOptionsToExtend: ts.WatchOptions | undefined = commandLine.watchOptions;
  const extendedConfigCache: ts.Map<ts.ExtendedConfigCacheEntry> | undefined = undefined;

  const config = ts.getParsedCommandLineOfConfigFile(configPath, optionsToExtend, host, extendedConfigCache, watchOptionsToExtend);
  host.onUnRecoverableConfigFileDiagnostic = undefined!; // TODO: GH#18217
  return config;
}

const getReporters = (sys: ts.System) => {
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: sys.getCurrentDirectory,
    getNewLine: () => sys.newLine
  };
  const printError = (... args: {toString: () => string}[]) => sys.write(args.map(x => x.toString()).join(''));
  function reportDiagnostic(diagnostic: ts.Diagnostic) {
    printError("Error", diagnostic.code, ":", ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
  }
  function reportUnrecoverableDiagnostic(diagnostic: ts.Diagnostic) {
    reportDiagnostic(diagnostic);
    sys.exit(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped);
  }
  return {reportDiagnostic, reportUnrecoverableDiagnostic}
}

export const parseTsConfig = (sys: ts.System) => {
  const commandLine = ts.parseCommandLine(sys.args, sys.readFile);
  const configPath = ts.findConfigFile(
    sys.getCurrentDirectory(),
    sys.fileExists,
    "tsconfig.json"
  );
  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  const reporters = getReporters(sys);

  const parsedConfig = getParsedConfig(configPath, commandLine, reporters.reportUnrecoverableDiagnostic, sys);
  if (!parsedConfig) {
    throw new Error("Could not parse 'tsconfig.json'.");
  }
  return parsedConfig;
}
export const compileTsProject = (sys: ts.System, parsedConfig: ts.ParsedCommandLine) => {
  //const { fileNames, options, projectReferences } = parsedConfig;
  const reporters = getReporters(sys);
  const solutionBuilderHost = ts.createSolutionBuilderHost(sys, ts.createEmitAndSemanticDiagnosticsBuilderProgram, reporters.reportDiagnostic);
  const solution = ts.createSolutionBuilder(solutionBuilderHost, [sys.getCurrentDirectory()], {} as ts.BuildOptions);
  solution.build();debugger;
}
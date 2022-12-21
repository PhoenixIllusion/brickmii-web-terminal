import { FileStat, FileType, GlobPattern, Uri } from "vscode";
import * as vs from "vscode";
import { SyncContract } from "./sync-contract";
import { ContractProducer, ContractTypeAsPromises, ExtractFunctions, JsonSerialized } from "./worker-contract";



class SyncContractAsPromise implements ContractTypeAsPromises<ExtractFunctions<SyncContract>> {
  async stat(uri: Uri): Promise<JsonSerialized<FileStat>> {
    const stat = await vs.workspace.fs.stat(uri);
    return JsonSerialized.fromSerializable(stat);
  }
  async readDirectory(uri: Uri): Promise<JsonSerialized<[string, FileType][]>> {
    const dir = await vs.workspace.fs.readDirectory(uri);
    return JsonSerialized.fromSerializable(dir);
  }
  async createDirectory(uri: Uri): Promise<void> {
    await vs.workspace.fs.createDirectory(uri);
    return;
  }
  async readFile(uri: Uri): Promise<Uint8Array> {
    const fileBuffer = await vs.workspace.fs.readFile(uri);
    return fileBuffer;
  }
  async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
    await vs.workspace.fs.writeFile(uri,content);
    return;
  }
  async delete(uri: Uri, options?: { recursive?: boolean | undefined; useTrash?: boolean | undefined; } | undefined): Promise<void> {
    await vs.workspace.fs.delete(uri, options);
    return;
  }
  async rename(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; } | undefined): Promise<void> {
    await vs.workspace.fs.rename(source, target, options);
    return;
  }
  async copy(source: Uri, target: Uri, options?: { overwrite?: boolean | undefined; } | undefined): Promise<void> {
    await vs.workspace.fs.copy(source, target, options);
    return;
  }
  async createFileSystemWatcher(globPattern: GlobPattern, ignoreCreateEvents?: boolean | undefined, ignoreChangeEvents?: boolean | undefined, ignoreDeleteEvents?: boolean | undefined): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

let producer: ContractProducer<SyncContract>;
onmessage = ( ev: MessageEvent<any>) => {
  if( ev.data && ev.data.sharedBuffer ) {
    producer = new ContractProducer<SyncContract>(new SyncContractAsPromise(), ev.data.sharedBuffer);
  } else if(producer) {
    producer.onMessage(ev)
  }
}

export default class WebpackWorker extends Worker {constructor() { super("");}}
import { SyncContract } from "./sync-contract";
import { ContractConsumer, ExtractFunctions } from "./worker-contract";

import SyncWorker from './sync-filesystem.worker'

export const SetupSyncFileSystem = (bufferSize: number) => {
  const worker = new SyncWorker();
  const sharedBuffer = new SharedArrayBuffer(bufferSize);
  worker.postMessage({ sharedBuffer }, [sharedBuffer]);

  const consumer = new ContractConsumer<ExtractFunctions<SyncContract>>(sharedBuffer, worker.postMessage);
  const proxy = consumer.getProxy();
  return {
    consumer,
    proxy,
    worker,
    sharedBuffer
  }
}
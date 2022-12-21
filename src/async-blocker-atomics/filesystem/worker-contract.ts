import { EventEmitter } from "vscode";

export class JsonSerialized<T> {
  obj: T;
  constructor(private json: string) {
    this.obj = JSON.parse(json);
  }
  get(): T {
    return this.obj;
  }
  toJson() {
    return this.json;
  }
  static fromSerializable<T>(obj: T) {
    return new JsonSerialized<T>(JSON.stringify(obj));
  }
}

type ValidResults = Promise<void> | Promise<Uint8Array> | JsonSerialized<any>

type ValidKey = number | symbol | string;
type FunctionAny = (...args: any[]) => any;
type PureFunction = { [key: ValidKey]: FunctionAny | never }
export type ExtractFunctions<Type> = {
  [Property in keyof Type]: Extract<Type[Property], FunctionAny>
}
type TypedFunction<T extends FunctionAny, U> = (...args: Parameters<T>) => U;
type ContractTypeReturnType<ReturnType> =
  ReturnType extends EventEmitter<any>
  ? Promise<void> :
  ReturnType extends (Uint8Array | void)
  ? Promise<ReturnType> :
  Promise<JsonSerialized<ReturnType>>;
type ContractTypeFunctions<T extends FunctionAny> = TypedFunction<T, ContractTypeReturnType<ReturnType<T>>>;
export type ContractTypeAsPromises<Type extends PureFunction> = {
  [Property in keyof Type]: ContractTypeFunctions<Type[Property]>
}


type ContractInvoke<Type> = { [Key in keyof ExtractFunctions<Type>]: {
  func: Key;
  args: Parameters<ExtractFunctions<Type>[Key]>
}
}[keyof ExtractFunctions<Type>]

const enum DataType {
  VOID = 1,
  JSON = 2,
  BUFFER = 3,
  BUFFER_INCOMPLETE = 4,
  BUFFER_COMPLETE = 5,
}

export class ContractProducer<T> {
  private textEncoder: TextEncoder;
  private atomic: Int32Array;
  private data: Uint8Array;

  constructor(private producer: ContractTypeAsPromises<ExtractFunctions<T>>, private lock: SharedArrayBuffer) {
    this.textEncoder = new TextEncoder();
    this.atomic = new Int32Array(this.lock.slice(0, 8));
    this.data = new Uint8Array(this.lock.slice(8));
  }
  private ping(type: DataType, length: number) {
    this.atomic[0] = type;
    this.atomic[1] = length;
    Atomics.notify(this.atomic, 0)
  }
  async onMessage(event: MessageEvent<ContractInvoke<T>>): Promise<void> {
    const { func, args } = event.data;
    const result: any = (await (this.producer[func](...args)));
    if (result === undefined || result === null) {
      this.ping(DataType.VOID, 0);
    } else
      if (result instanceof Uint8Array) {
        this.sendBufferResult(result);
      } else if (result instanceof JsonSerialized<any>) {
        this.sendJsonResult(result);
      }
  }
  async sendBufferResult(buffer: Uint8Array) {
    const BUFF_LEN = this.data.byteLength;
    if(buffer.byteLength < BUFF_LEN) {
      this.data.set(buffer);
      this.ping(DataType.BUFFER, buffer.length);
    }
    let total = 0;
    for(let i=0;i<buffer.length-BUFF_LEN;i+=BUFF_LEN) {
      this.data.set(buffer.subarray(i, total+BUFF_LEN));
      total += BUFF_LEN;
      this.ping(DataType.BUFFER_INCOMPLETE, BUFF_LEN);
      Atomics.wait(this.atomic,0,DataType.BUFFER_INCOMPLETE);
    }
    this.data.set(buffer.subarray(total, buffer.length - total));
    this.ping(DataType.BUFFER_COMPLETE, buffer.length - total);
  }
  sendJsonResult(result: JsonSerialized<any>) {
    const string = result.toJson();
    const res = this.textEncoder.encodeInto(string, this.data);
    this.ping(DataType.JSON, res.written||string.length);
  }
}

export class ContractConsumer<T extends PureFunction> implements ProxyHandler<T>{
  private textDecoder: TextDecoder;
  private atomic: Int32Array;
  private data: Uint8Array;
  constructor( private lock: SharedArrayBuffer, private postMessage: (message: any, options?: StructuredSerializeOptions | undefined) => void) {
    this.textDecoder = new TextDecoder();
    this.atomic = new Int32Array(this.lock.slice(0, 4));
    this.data = new Uint8Array(this.lock.slice(4));
  }
  getProxy() {
    return new Proxy<T>(new Object() as T, this);
  }
  _postMessage(data:{func: string | symbol, args: any}) {
    this.postMessage(data)
  }
  buffer():Uint8Array {
    const dst = new Uint8Array(this.atomic[1]);
    dst.set(this.data.subarray(0, this.atomic[1]));
    return dst;
  }
  concatBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((acc, value) => acc + value.length, 0);
    const result = new Uint8Array(totalLength);
    let length = 0;
    for(let array of buffers) {
          result.set(array, length);
          length += array.length;
    }
    return result;
  }
  get(target: T, p: string | symbol, receiver: any) {
    return (... args: any[]) => {
      this.atomic[0] = 0;
      this._postMessage({func: p, args })
      Atomics.wait(this.atomic,0,0);
      switch(this.atomic[0] as DataType) {
        case DataType.BUFFER:
          return this.buffer();
        case DataType.JSON:
          return new JsonSerialized(this.textDecoder.decode(this.buffer()));
        case DataType.BUFFER_INCOMPLETE:
          const ret: Uint8Array[] = [];
          do {
            ret.push(this.buffer());
            this.atomic[0] = 0;
            Atomics.wait(this.atomic, 0, 0);
          }
          while(this.atomic[0]!=DataType.BUFFER_COMPLETE)
          ret.push(this.buffer());
          return this.concatBuffers(ret);
      }
    }
  }
}
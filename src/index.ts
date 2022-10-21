import WebSocket from "ws";
import EventEmitter from "events";

function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class WebSocketWrapper extends EventEmitter {
  url: string;
  #connection: WebSocket | null = null;
  #explicitClose: boolean = false;
  #connecting: boolean = false;
  #connectionTries: number = 0;
  #connectionTriesMax: number = Infinity;
  #onConnectionEstablished: Function | null = null;
  #onConnectionFailed: Function | null = null;
  #sendQueue: any[] = [];
  #sendQueueEnabled: boolean = false;

  #allEvents: Array<string> = [
    "close",
    "error",
    "upgrade",
    "message",
    "open",
    "ping",
    "pong",
    "unexpected-response",
  ];

  #connectionEstablished() {
    console.log("connection established")
    this.#onConnectionEstablished = null;
    this.#connectionTries = 0;
    this.#connecting = false;
    this.#flushQueue();
  }

  constructor(url: string) {
    super();
    this.url = url;
  }

  isConnected() {
    if (!this.#connection) return false;
    return this.#connection.readyState === WebSocket.OPEN;
  }

  async #flushQueue() {
    console.log(`flushing queue with ${this.#sendQueue.length} items.`);
    while (this.#sendQueue.length > 0)
    {
      await timeout(100);
      this.send(this.#sendQueue.shift())
    }
  }

  send(data: any) {
    // if (!this.isConnected()) throw new Error("not connected");
    if (!this.isConnected()) {
      if(this.#sendQueueEnabled)
        this.#sendQueue.push(data);
    } else
      this.#connection?.send(data);
  }

  async connect() {
    if (this.isConnected())
      if (this.#connecting) throw new Error('already connecting');
    this.#connecting = true;
    return await this.#internalConnect();
  }

  async #internalConnect() {
    this.#explicitClose = false;
    this.#connectionTries = this.#connectionTries + 1;
    console.log("connection try number", this.#connectionTries)
    if (this.#connectionTries > this.#connectionTriesMax) {
      if (this.#onConnectionFailed)
        return this.#onConnectionFailed('max retries exceeded');
      // throw new Error('max retries exceeded');
      else
        console.log("no connection failed handler");
    }

    if (this.#connection === null) {
      this.#connection = new WebSocket(this.url);
    }

    // catch all specified events, optionally intercept and forward
    this.#allEvents.forEach((event) => {
      (this.#connection as WebSocket).on(event, async (...args: any[]) => {
        if(event === "message")
        {
          if(args[0].toString().startsWith("___disableSendQueue"))
          {
            console.log("send queue disabled by remote.")
            return this.#sendQueueEnabled = false;
          }
          if(args[0].toString().startsWith("___enableSendQueue"))
          {
            console.log("send queue enabled by remote.")
            return this.#sendQueueEnabled = true;
          }
        }
        this.emit(event, ...args);
      });
    });

    const initiateReconnect = () => {
      if (this.#explicitClose) return;
      this.#connection = null;
      setTimeout(() => this.#internalConnect(), 1000);
    };

    const handlers: { event: string, fn: any }[] = [];
    const removeHandlers = () => {
      handlers.forEach((handler) => this.#connection?.off(handler.event, handler.fn));
    }
    this.#connection.once('open', () => {
      removeHandlers();
      if (this.#onConnectionEstablished) this.#onConnectionEstablished();
    });
    this.#connection.once('error', (err) => {
      // empty handler to not have unhandled error
    });
    this.#connection.once('close', (err) => {
      // if (this.#onConnectionFailed) this.#onConnectionFailed('connection error');
      setTimeout(initiateReconnect, 0);
    });

    if (this.#onConnectionEstablished !== null) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.#onConnectionEstablished = () => {
        this.#connectionEstablished();
        resolve(null);
      }
      this.#onConnectionFailed = reject;
    });
  }

  close() {
    if (this.#connection != null || this.#connection != undefined) {
      this.#explicitClose = true;
      this.#connection.close();
      this.#connection = null;
      this.#connecting = false;
      this.#connectionTries = 0;
      this.#onConnectionEstablished = null;
    }
  }
}

export { WebSocketWrapper };

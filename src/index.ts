import WebSocket from "ws";
import EventEmitter from "events";

class WebSocketWrapper extends EventEmitter {
  url: string;
  #connection: WebSocket | null = null;
  #explicitClose: boolean = false;
  #connecting: boolean = false;
  #connectionTries: number = 0;
  #connectionTriesMax: number = Infinity;
  #onConnectionEstablished: Function | null = null;
  #onConnectionFailed: Function | null = null;

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
    this.#onConnectionEstablished = null;
    this.#connectionTries = 0;
    this.#connecting = false;
  }

  constructor(url: string) {
    super();
    this.url = url;
  }

  isConnected() {
    if (!this.#connection) return false;
    return this.#connection.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (!this.isConnected()) throw new Error("not connected");
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

    const initiateReconnect = () => {
      if (this.#explicitClose) return;
      this.#connection = null;
      setTimeout(() => this.#internalConnect(), 1000);
    };

    const interceptors: { [key: string]: Function } = {
      close: initiateReconnect,
      error: initiateReconnect,
      open: () => {
        if (this.#onConnectionEstablished !== null) this.#onConnectionEstablished();
      }
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
      console.log("trigger close")
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
      // catch all specified events, optionally intercept and forward
      // this.#allEvents.forEach((event) => {
      //   (this.#connection as WebSocket).on(event, async (...args: any[]) => {
      //     console.log(event, args);
      //     // // intercept event
      //     // if (event in interceptors)
      //     // {
      //     //   try {
      //     //     interceptors[event]();
      //     //   } catch(err) {
      //     //     reject(err);
      //     //   }
      //     //   // don't forward if we are still connecting
      //     //   if(this.#connecting)
      //     //     return;
      //     // }

      //     // if(event === 'open')
      //     //   resolve(null);

      //     // // forward event
      //     // this.emit(event, ...args);
      //   });
      // });
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

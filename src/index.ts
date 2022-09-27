import WebSocket from "ws";
import EventEmitter from "events";

class WebSocketWrapper extends EventEmitter {
  url: string;
  #connection: WebSocket | null = null;
  #explicitClose: boolean = false;
  #connecting: false;
  #connectionTries: 0;
  #connectionTriesMax: 3;

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

  constructor(url: string) {
    super();
    this.url = url;
  }

  isConnected(connection: WebSocket | null): connection is WebSocket {
    if (!this.#connection) return false;
    return this.#connection.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (!this.isConnected(this.#connection)) throw new Error("not connected");
    this.#connection.send(data);
  }

  async #internalConnect() {
     this.#explicitClose = false;
    
    let connecting = true;
    const maxTries = 3;
    let retryCount = 0;

    if (this.#connection === null) {
      this.#connection = new WebSocket(this.url);
    }

    const initiateReconnect = () => {
      retryCount++;
      if(retryCount > maxTries) throw new Error('max retries exceeded');
      if(this.#explicitClose) return;
      this.#connection = null;
      setTimeout(() => this.connect(), 1000);
    };

    const interceptors: { [key: string]: Function } = {
      close: initiateReconnect,
      error: initiateReconnect,
      open: () => {
        retryCount = 0;
        connecting = false;
      }
    };
    
    return new Promise((resolve, reject) => {
      // catch all specified events, optionally intercept and forward
      this.#allEvents.forEach((event) => {
        (this.#connection as WebSocket).on(event, (...args) => {
          // intercept event
          if (event in interceptors)
          {
            try {
            const result = interceptors[event]();
            } catch(err) {
              
            }
            // don't forward if we are still connecting
            if(connecting)
              return;
          }

          // forward event
          this.emit(event, ...args);
        });
      });
    });
  }

  async connect() {
    if(this.#connecting) throw new Error('already connecting');
    return await this.#internalConnect();
  }

  close() {
    if (this.#connection != null || this.#connection != undefined) {
      this.#explicitClose = true;
      this.#connection.close();
      this.#connection = null;
    }
  }
}

export { WebSocketWrapper };

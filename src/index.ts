import WebSocket from "ws";
import EventEmitter from "events";

class WebSocketWrapper extends EventEmitter {
  url: string;
  connection: WebSocket | null = null;

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
    if (!this.connection) return false;
    return this.connection.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (!this.isConnected(this.connection)) throw new Error("not connected");
    this.connection.send(data);
  }

  connect() {
    if (this.connection === null) {
      this.connection = new WebSocket(this.url);
    }

    const initiateReconnect = () => {
      this.connection = null;
      setTimeout(() => this.connect(), 1000);
    };

    const interceptors: { [key: string]: Function } = {
      close: initiateReconnect,
    };

    // catch all specified events, optionally intercept and forward
    this.#allEvents.forEach((event) => {
      (this.connection as WebSocket).on(event, (...args) => {
        // intercept event
        if (event in interceptors) interceptors[event]();

        // forward event
        this.emit(event, ...args);
      });
    });
  }

  close() {
    if (this.connection != null || this.connection != undefined) {
      this.connection.close();
      this.connection = null;
    }
  }
}

export { WebSocketWrapper };

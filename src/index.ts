import WebSocket from 'ws';
import EventEmitter from 'events';

class WebSocketWrapper extends EventEmitter {
  url: string;
  connection: WebSocket | null = null;

  constructor(url: string) {
    super();
    this.url = url;
  }

  connect() {
    if (this.connection === null) {
      this.connection = new WebSocket(this.url);
    }

    this.connection.onopen = () => { };

    this.connection.onmessage = (event) => {
      this.emit('message', event.data);
    };

    this.connection.onclose = () => {
      this.connection = null;
      setTimeout(() => this.connect(), 1000);
    };

    this.connection.onerror = () => {
      this.connection = null;
      setTimeout(() => this.connect(), 1000);
    };
  }

  close() {
    if (this.connection != null || this.connection != undefined) {
      this.connection.close();
      this.connection = null;
    }
  }
}

export { WebSocketWrapper };
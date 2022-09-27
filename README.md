# ws-wrapper

Work-in-progress Typescript wrapper around ws package, implementing auto-reconnect and simpliying high-level usage.

More usages to come.

```typescript
const client = new WebSocketWrapper(remoteUrl)
client.on('open', () => { /* ... */ });
client.on('close', () => { /* ... */ });
client.on('message', msg => console.log('server says:', msg.toString()));
```

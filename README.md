# ws-wrapper



```typescript
const client = new WebSocketWrapper(remoteUrl)
client.on('open', () => { /* ... */ });
client.on('close', () => { /* ... */ });
client.on('message', msg => console.log('server says:', msg.toString()));
```

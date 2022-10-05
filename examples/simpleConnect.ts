import { WebSocketWrapper } from "../src";

const remoteUrl = "ws://localhost:8023";

const main = async () => {
    const client = new WebSocketWrapper(remoteUrl)
    try {
        await client.connect();
        let i = 0;
        setInterval(() => client.send(i++), 500);
    } catch(err: any) {
        console.log("client.connect error:", err);
        console.log(err?.stack);
    }
    
}

main();
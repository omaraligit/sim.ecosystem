class Bunny {
    private gender: "male" | "female";
    private stage: "baby" | "adult" | "elder";
    private id: number;
    // position
    private x: number = 1;
    private y: number = 1;
    public world: World;
    // pregnancy
    private isPregnant: boolean = false;
    private pregnancyDuration: number = 10;
    private pregnancyProgress: number = 0;
    // needs
    private thirst: number = 0;
    private hunger: number = 0;
    private happiness: number = 0;
    private age: number = 0;
    private maxThirst: number = 10;
    private maxHunger: number = 10;
    private maxHappiness: number = 10;
    private maxAge: number = 120;
    public isDead: boolean = false;
    constructor(gender: "male" | "female", x: number = 0, y: number = 0, stage: "baby" | "adult" | "elder" = "adult", world: World) {
        this.gender = gender;
        this.id = Math.floor(Math.random() * 1000);
        this.x = x;
        this.y = y;
        this.stage = stage;
        this.world = world;
    }
    tick(): void {
        this.tickNeeds();
        this.move();
        // console.log(this)
        console.log(`dead: ${this.isDead} ${this.stage} bunny ${this.id} at ${this.x}, ${this.y} with thirst: ${this.thirst}, hunger: ${this.hunger}, happiness: ${this.happiness}, age: ${this.age} tick`);
    }
    tickNeeds(): void {
        this.thirst = Math.min(Math.max(this.thirst + 1, 0), this.maxThirst);
        this.hunger = Math.min(Math.max(this.hunger + 1, 0), this.maxHunger);
        this.happiness = Math.min(Math.max((this.thirst + this.hunger) / 2, 0), this.maxHappiness);
        this.age++;
        if (this.age < 10) {
            this.stage = "baby";
        } else if (this.age >= 10 && this.age < 60) {
            this.stage = "adult";
        } else {
            this.stage = "elder";
        }
        if (this.age > this.maxAge && Math.random() < 0.1) {
            this.isDead = true;
        }
    }
    move(): void {
        // if (Math.random() < 0.6) {
        // return;
        // }
        const DIRECTIONS = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1],
        ];
        const randomDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const r = this.x + randomDirection[0];
        const c = this.y + randomDirection[1];
        if (r >= 0 && r < this.world.tiles.length && c >= 0 && c < this.world.tiles[r].length) {
            this.x = r;
            this.y = c;
        }
    }
}
import { PerlinNoise } from '@arvarus/trouz';

class World {
    private width: number = 10;
    private height: number = 10;
    public tiles: string[][] = []
    public perlinValue: number[][] = [];
    public xscale: number = 0.045 + Math.random() * 0.01;
    public yscale: number = 0.095 + Math.random() * 0.01;
    private seed: number = 42;
    constructor(width: number = 10, height: number = 10, seed: number = 42) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        // Instantiate with an optional seed and grid dimensions
        const perlin = new PerlinNoise({ seed: this.seed, gridSize: [64, 64] });

        // Get a smooth value at coordinates (returns approximately -1 to 1)
        const value = perlin.noise([10.5, 20.3]);
        console.log(value);
        for (let i = 0; i < width; i++) {
            let r = [];
            let p = [];
            for (let j = 0; j < height; j++) {
                const noise = perlin.noise([i * this.xscale, j * this.yscale]);
                r.push(this.setTileByValue(noise));
                p.push(noise);
            }
            this.tiles.push(r);
            this.perlinValue.push(p);
        }
    }
    setTileByValue(noise: number): string {
        if (noise > 0.65) return "rock";
        if (noise > 0.2) return "tree";
        if (noise > -0.1) return "grass";
        return "water";
    }
    getTile(x: number, y: number): string {
        return this.tiles[x][y];
    }
    getNeighbors(x: number, y: number): string[] {
        const DIRECTIONS = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1],
        ];
        const neighbors: string[] = [];

        for (const [dr, dc] of DIRECTIONS) {
            const r = x + dr;
            const c = y + dc;

            if (r >= 0 && r < this.tiles.length && c >= 0 && c < this.tiles[r].length) {
                neighbors.push(this.tiles[r][c]);
            }
        }

        return neighbors;
    }
}

class Sim {
    public bunnies: Bunny[] = [];
    public world: World = new World(20, 20, Math.floor(Math.random() * 1000));
    public ws: WebSocketServer;
    constructor(ws: WebSocketServer) {

        this.ws = ws;
        ws.on("connection", (client: WebSocket) => {
            console.log("client connected");
            client.on("message", (message: any) => {
                console.log(message.toString(),"ddd");
                const data = message.toString();
                const jsonData = JSON.parse(data);
                if (jsonData.event === "sim_add_bunny") {
                    this.bunnies.push(new Bunny("male", 0, 0, "adult", this.world));
                    console.log("added bunny");
                } 
                else if (jsonData.event === "sim_set_seed") {
                    this.world = new World(20, 20, jsonData.data.seed);
                    console.log("set seed to " + jsonData.data.seed);
                }
                else {
                    console.log("invalid message");
                }
            });
        });        
        for (const client of this.ws.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    event: "world_update",
                    data: {
                        world: this.world
                    },
                }));
            }
        }
    }
    async tick(): Promise<void> {
        while (true) {
            for (const bunny of this.bunnies) {
                bunny.tick();
                for (const client of this.ws.clients) {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            event: "bunny_update",
                            data: {
                                bunny
                            },
                        }));
                        client.send(JSON.stringify({
                            event: "bunny_count_update",
                            data: {
                                bunnyCount: this.bunnies.length
                            },
                        }));
                    }
                }
            }
            for (const client of this.ws.clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        event: "world_update",
                        data: {
                            world: this.world
                        },
                    }));
                }
            }
            this.bunnies = this.bunnies.filter(bunny => !bunny.isDead);
            await new Promise(resolve => setTimeout(resolve, 750));
        }
    }
}











import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
    port: 8080,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },

        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed if context takeover is disabled.
    }
});



const sim = new Sim(wss);
sim.tick();
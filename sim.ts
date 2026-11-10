import { PerlinNoise } from '@arvarus/trouz';
import WebSocket, { WebSocketServer } from 'ws';

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
];

class Bunny {
    private static nextId: number = 1;
    private gender: "male" | "female";
    private stage: "baby" | "adult" | "elder";
    private id: number;
    // position
    private x: number = 1;
    private y: number = 1;
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
    constructor(gender: "male" | "female", x: number = 0, y: number = 0, stage: "baby" | "adult" | "elder" = "adult") {
        this.gender = gender;
        this.id = Bunny.nextId++;
        this.x = x;
        this.y = y;
        this.stage = stage;
    }
    toSnapshot() {
        return {
            id: this.id,
            gender: this.gender,
            stage: this.stage,
            x: this.x,
            y: this.y,
            isPregnant: this.isPregnant,
            thirst: this.thirst,
            hunger: this.hunger,
            happiness: this.happiness,
            age: this.age,
        };
    }
    tick(world: World): void {
        this.tickNeeds();
        this.move(world);
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
    move(world: World): void {
        const randomDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const r = this.x + randomDirection[0];
        const c = this.y + randomDirection[1];
        if (r >= 0 && r < world.tiles.length && c >= 0 && c < world.tiles[r].length) {
            this.x = r;
            this.y = c;
        }
    }
}

class World {
    public readonly width: number = 10;
    public readonly height: number = 10;
    public tiles: string[][] = []
    public perlinValue: number[][] = [];
    public xscale: number = 0.25;
    public yscale: number = 0.25;
    public readonly seed: number = 42;
    public bunnies: Bunny[] = [];
    constructor(width: number = 10, height: number = 10, seed: number = 42) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        // Instantiate with an optional seed and grid dimensions
        const perlin = new PerlinNoise({ seed: this.seed, gridSize: [64, 64] });
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
        if (noise > 0.40) return "rock";
        if (noise > 0.35) return "tree";
        if (noise > -0.25) return "grass";
        return "water";
    }
    getTile(x: number, y: number): string {
        return this.tiles[x][y];
    }
    getNeighbors(x: number, y: number): string[] {
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
    toStaticSnapshot() {
        return {
            width: this.width,
            height: this.height,
            seed: this.seed,
            tiles: this.tiles,
        };
    }
    addBunny(bunny: Bunny): void {
        this.bunnies.push(bunny);
    }
    tick(): void {
        for (const bunny of this.bunnies) bunny.tick(this);
        this.bunnies = this.bunnies.filter(bunny => !bunny.isDead);
    }
}

class Sim {
    public world: World = new World(20, 20, Math.floor(Math.random() * 1000));
    public ws: WebSocketServer;
    private tickCount: number = 0;
    constructor(ws: WebSocketServer) {
        this.ws = ws;
        ws.on("connection", (client: WebSocket) => {
            console.log("client connected");
            client.send(JSON.stringify({ event: "world_init", data: this.world.toStaticSnapshot() }));
            client.send(JSON.stringify({ event: "tick", data: this.tickSnapshot() }));
            client.on("message", (message: any) => {
                console.log(message.toString(),"ddd");
                let jsonData;
                try {
                    jsonData = JSON.parse(message.toString());
                } catch {
                    console.log("invalid message");
                    return;
                }
                if (jsonData.event === "sim_add_bunny") {
                    this.world.addBunny(new Bunny("male", 0, 0, "adult"));
                    console.log("added bunny");
                } 
                else if (jsonData.event === "sim_set_seed") {
                    this.world = new World(20, 20, jsonData.data.seed);
                    this.broadcast("world_init", this.world.toStaticSnapshot());
                    console.log("set seed to " + jsonData.data.seed);
                }
                else {
                    console.log("invalid message");
                }
            });
        });
    }
    private broadcast(event: string, data: object): void {
        const message = JSON.stringify({ event, data });
        for (const client of this.ws.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
    private tickSnapshot() {
        return {
            tick: this.tickCount,
            bunnies: this.world.bunnies.map(bunny => bunny.toSnapshot()),
        };
    }
    async tick(): Promise<void> {
        while (true) {
            this.world.tick();
            this.tickCount++;
            this.broadcast("tick", this.tickSnapshot());
            await new Promise(resolve => setTimeout(resolve, 750));
        }
    }
}

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

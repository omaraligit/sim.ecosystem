import { PerlinNoise } from '@arvarus/trouz';
import WebSocket, { WebSocketServer } from 'ws';

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
];

class Bunny {
    public world: World;
    public neighbors: { neighbors: string[], neighborTilesCords: number[][] } = { neighbors: [], neighborTilesCords: [] };
    public waterTile: number[] | null = null;
    public foodTile: number[] | null = null;
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
    private thirst: number = Math.floor(Math.random() * 100);
    private hunger: number = Math.floor(Math.random() * 100);
    private happiness: number = 100;
    private age: number = 0;
    private maxAge: number = 120;
    public isDead: boolean = false;

    private currentAction: any;
    private actions: any[] = [
        {
          name: 'DRINK',
          calculateUtility: () => {
            for (const [index, neighbor] of this.neighbors.neighbors.entries()) {
                if (neighbor === "water") {
                    this.waterTile = this.neighbors.neighborTilesCords[index];
                }
            }
            if (this.waterTile) {
                return this.getUrgency(this.thirst);
            }
            return 0.0;
          },
          execute: (bunny: Bunny) => {
            bunny.move(bunny.waterTile);
            bunny.thirst = Math.max(0, bunny.thirst - 5);
          }
        },
        {
            name: 'WANDER',
            calculateUtility: () => {
              return 0.15; // Low constant baseline score so it always has something to do if idle
            },
            execute: (bunny: Bunny) => {
              // console.log(`Bunny ${bunny.id} is hopping around exploring.`);
                this.move(bunny.neighbors.neighborTilesCords[Math.floor(Math.random() * bunny.neighbors.neighborTilesCords.length)]);
            }
          },
        {
          name: 'EAT',
          calculateUtility: () => {
            for (const [index, neighbor] of this.neighbors.neighbors.entries()) {
                if (neighbor === "grass") {
                    this.foodTile = this.neighbors.neighborTilesCords[index];
                }
            }
            if (this.foodTile) {
                return this.getUrgency(this.hunger);
            }
            return 0.0;
          },
          execute: (bunny: Bunny) => {
            bunny.move(bunny.foodTile);
            bunny.hunger = Math.max(0, bunny.hunger - 5);
          }
        }
    ]
    // Helper curve: maps 0-100 to an exponential 0.0-1.0 urgency
    private getUrgency(value: number): number {
        const normalized = Math.max(0, Math.min(100, value)) / 100;
        return Math.pow(normalized, 2); // Exponential curve: low values stay low, high values spike
    }
    constructor(gender: "male" | "female", x: number = 0, y: number = 0, stage: "baby" | "adult" | "elder" = "adult", world: World) {
        this.gender = gender;
        this.id = Bunny.nextId++;
        this.x = x;
        this.y = y;
        this.stage = stage;
        this.world = world;
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
            currentAction: this.currentAction,
        };
    }
    tick(): void {
        this.tickNeeds();
        this.neighbors = this.world.getNeighbors(this.x, this.y);
    }
    tickNeeds(inertiaBonus: number = 0.1): void {
        this.hunger = Math.min(100, this.hunger + 0.5);
        this.thirst = Math.min(100, this.thirst + 0.8);
        this.happiness = Math.min(100, this.happiness + 0.3);
        let bestAction: any = this.actions[0];
        let highestScore = -1;

        // 2. Evaluate all actions
        for (const action of this.actions) {
        let score = action.calculateUtility();

        // Add inertia bonus to the currently running action to prevent twitchy oscillations
        if (action.name === this.currentAction) {
            score += inertiaBonus;
        }

        if (score > highestScore) {
            highestScore = score;
            bestAction = action;
        }
        }

        // 3. Switch and execute the winner
        this.currentAction = bestAction.name;
        // console.log("executing action", bestAction.name);
        bestAction.execute(this);

        // 4. Age the bunny
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
    move(destination: number[] | null): void {
        console.log("moving to", destination);
        if (destination) {
            this.x = destination[0];
            this.y = destination[1];
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
        if (noise > 0.25) return "tree";
        if (noise > -0.25) return "grass";
        return "water";
    }
    getTile(x: number, y: number): string {
        return this.tiles[x][y];
    }
    getNeighbors(x: number, y: number): { neighbors: string[], neighborTilesCords: number[][] } {
        const neighbors: string[] = [];
        const neighborTilesCords: number[][] = [];
        for (const [dr, dc] of DIRECTIONS) {
            const r = x + dr;
            const c = y + dc;

            if (r >= 0 && r < this.tiles.length && c >= 0 && c < this.tiles[r].length) {
                neighbors.push(this.tiles[r][c]);
                neighborTilesCords.push([r, c]);
            }
        }

        return { "neighbors": neighbors, "neighborTilesCords": neighborTilesCords };
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
        for (const bunny of this.bunnies) bunny.tick();
        this.bunnies = this.bunnies.filter(bunny => !bunny.isDead);
    }
}

class Sim {
    public world: World = new World(20, 20, Math.floor(Math.random() * 1000));
    public ws: WebSocketServer;
    private tickCount: number = 0;
    lastTickTime: number = 0;
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
                    for (let i = 0; i < 1; i++) {
                    this.world.addBunny(new Bunny("male", 0, 0, "adult", this.world));
                    }
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
            const startTime = performance.now();
            this.world.tick();
            const endTime = performance.now();
            
            console.log(`Time taken: ${(endTime - startTime).toFixed(4)} ms`);
            this.tickCount++;
            this.broadcast("tick", this.tickSnapshot());
            await new Promise(resolve => setTimeout(resolve, 1500));
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

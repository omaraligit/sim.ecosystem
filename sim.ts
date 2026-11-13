import { PerlinNoise } from '@arvarus/trouz';
import WebSocket, { WebSocketServer } from 'ws';

const DIRECTIONS = [
    // Layer 2 (Outer ring) & Layer 1 combined (Radius 2)
    [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2],
    [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2],
    [ 0, -2], [ 0, -1],          [ 0, 1], [ 0, 2], // Note: [0, 0] is skipped (the bunny's own tile)
    [ 1, -2], [ 1, -1], [ 1, 0], [ 1, 1], [ 1, 2],
    [ 2, -2], [ 2, -1], [ 2, 0], [ 2, 1], [ 2, 2],
];

class Bunny {
    public world: World;
    public neighbors: { neighbors: string[], neighborTilesCords: number[][], neighborTilesContent: number[] } = { neighbors: [], neighborTilesCords: [], neighborTilesContent: [] };
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
    public thirst: number = Math.floor(Math.random() * 100);
    public hunger: number = Math.floor(Math.random() * 100);
    public happiness: number = 100;
    public age: number = 0;
    private maxAge: number = 120;
    public isDead: boolean = false;

    private currentAction: any;
    private actions: any[] = [
        {
          name: 'DRINK',
          calculateUtility: () => {
            this.waterTile = null;
            for (const [index, neighbor] of this.neighbors.neighbors.entries()) {
                if (neighbor === "water" && this.neighbors.neighborTilesContent[index] > 0) {
                    this.waterTile = this.neighbors.neighborTilesCords[index];
                }
            }
            if (this.waterTile) {
                return this.getUrgency(this.thirst);
            }
            return 0.0;
          },
          execute: (bunny: Bunny) => {
              if (bunny.waterTile) {
                bunny.move(bunny.waterTile);
                bunny.thirst = Math.max(0, bunny.thirst - 5);
                bunny.world.consumeTile(bunny.waterTile[0], bunny.waterTile[1]);
            }
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
            this.foodTile = null;
            for (const [index, neighbor] of this.neighbors.neighbors.entries()) {
                if (neighbor === "grass" && this.neighbors.neighborTilesContent[index] > 0) {
                    this.foodTile = this.neighbors.neighborTilesCords[index];
                }
            }
            if (this.foodTile) {
                return this.getUrgency(this.hunger);
            }
            return 0.0;
          },
          execute: (bunny: Bunny) => {
            if (bunny.foodTile) {
                bunny.move(bunny.foodTile);
            bunny.world.consumeTile(bunny.foodTile[0], bunny.foodTile[1]);
            bunny.hunger = Math.max(0, bunny.hunger - 5);
            }
            return 0.0;
          },
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
        this.thirst = Math.min(100, this.thirst + 0.5);
        if (this.hunger > 90 || this.thirst > 90) {
            this.happiness = Math.max(0, this.happiness - 3);
            if (this.happiness <= 0) {
                this.isDead = true;
                return;
            }
        } else {
            this.happiness = Math.min(100, this.happiness + 0.3);
        }
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
        if (destination) {
            this.x = destination[0];
            this.y = destination[1];
        }
    }
}

class World {
    public width: number = 10;
    public height: number = 10;
    public tiles: string[][] = []
    public tilesContent: number[][] = [];
    public perlinValue: number[][] = [];
    public xscale: number = 0.25;
    public yscale: number = 0.25;
    public readonly seed: number = 42;
    public bunnies: Bunny[] = [];
    constructor(width: number = 10, height: number = 10, seed: number = 42) {
        this.tilesContent = Array.from({ length: width }, () => Array(height).fill(10));
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
    consumeTile(x: number, y: number): void {
        this.tilesContent[x][y]= this.tilesContent[x][y]-1 < 0 ? 0 : this.tilesContent[x][y]-1;
    }
    getTile(x: number, y: number): string {
        return this.tiles[x][y];
    }
    getNeighbors(x: number, y: number): { neighbors: string[], neighborTilesCords: number[][], neighborTilesContent: number[] } {
        const neighbors: string[] = [];
        const neighborTilesCords: number[][] = [];
        const neighborTilesContent: number[] = [];
        // push the current tile
        neighbors.push(this.tiles[x][y]);
        neighborTilesCords.push([x, y]);
        neighborTilesContent.push(this.tilesContent[x][y]);
        for (const [dr, dc] of DIRECTIONS) {
            const r = x + dr;
            const c = y + dc;

            if (r >= 0 && r < this.tiles.length && c >= 0 && c < this.tiles[r].length) {
                neighbors.push(this.tiles[r][c]);
                neighborTilesCords.push([r, c]);
                neighborTilesContent.push(this.tilesContent[r][c]);
            }
        }

        return { "neighbors": neighbors, "neighborTilesCords": neighborTilesCords, "neighborTilesContent": neighborTilesContent };
    }
    toStaticSnapshot() {
        return {
            width: this.width,
            height: this.height,
            seed: this.seed,
            tiles: this.tiles,
            tilesContent: this.tilesContent
        };
    }
    addBunny(bunny: Bunny): void {
        this.bunnies.push(bunny);
    }
    tick(): void {
        // replanish resources
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.tiles[i][j] === "grass" || this.tiles[i][j] === "water" ) {
                    this.tilesContent[i][j] = this.tilesContent[i][j] > 0 ? Math.min(10, this.tilesContent[i][j] + 0.05) : 0;
                }
            }
        }
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
                    for (let i = 0; i < 1000; i++) {
                    this.world.addBunny(new Bunny("male", this.world.width/2, this.world.height/2, "adult", this.world));
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
            tilesContent: this.world.tilesContent,
        };
    }
    async tick(): Promise<void> {
        while (true) {
            const startTime = performance.now();
            this.world.tick();
            this.record(this.tickCount, this.world.bunnies);
            const endTime = performance.now();
            console.log(`Time taken: ${(endTime - startTime).toFixed(4)} ms`);
            this.tickCount++;
            this.broadcast("tick", this.tickSnapshot());
            this.broadcast("history", this.history);
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    }

    history: { tick: number, avgHunger: number, avgThirst: number, avgHappiness: number, populationCount: number, avgAge: number }[] = [];
  maxHistoryLength = 100;

  public record(tick: number, bunnies: Bunny[]) {
    if (bunnies.length === 0) return;

    const totals = bunnies.reduce((acc, b) => {
      acc.hunger += b.hunger;
      acc.thirst += b.thirst;
      acc.happiness += b.happiness;
      acc.age += b.age;
      return acc;
    }, { hunger: 0, thirst: 0, happiness: 0, age: 0 });

    const stats = {
      tick,
      avgHunger: totals.hunger / bunnies.length,
      avgThirst: totals.thirst / bunnies.length,
      avgHappiness: totals.happiness / bunnies.length,
      populationCount: bunnies.length,
      avgAge: totals.age / bunnies.length,
    };

    this.history.push(stats);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift(); // Keep it fixed length
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

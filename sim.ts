import { PerlinNoise } from '@arvarus/trouz';
import WebSocket, { WebSocketServer } from 'ws';

const DIRECTIONS_LAYER_2 = [
    // Layer 2 (Outer ring) & Layer 1 combined (Radius 2)
    [ 0,  0], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2],
    [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2],
    [ 0, -2], [ 0, -1], [ 0, 1], [ 0, 2],
    [ 1, -2], [ 1, -1], [ 1, 0], [ 1, 1], [ 1, 2],
    [ 2, -2], [ 2, -1], [ 2, 0], [ 2, 1], [ 2, 2],
];
const DIRECTIONS = [
    [0,  0], [-1,  0], [-1, 1],
    [0, -1], [-1, -1], [0,  1],
    [1, -1], [1,   0], [1,  1],
    ]
interface DNA {
    gender: number; // 0 = male, 1 = female
    maxAge: number;
    pregnancyDuration: number;
    hungerRate: number;
    thirstRate: number;
    eatAmount: number;
    drinkAmount: number;
    distressThreshold: number;
    happinessDecay: number;
    happinessRecovery: number;
    offspringChance: number;
}
 // 0 is male
 function randomDna(): DNA {
    return {
        gender: Math.random() < 0.5 ? 0 : 1,
        maxAge: 120,
        pregnancyDuration: 10,
        hungerRate: Math.random() * 0.5 + 0.1,
        thirstRate: Math.random() * 0.5 + 0.1,
        eatAmount: 5,
        drinkAmount: Math.random() * 5 + 5,
        distressThreshold: Math.random() * 90 + 10,
        happinessDecay: Math.random() * 3 + 1,
        happinessRecovery: Math.random() * 0.3 + 0.1,
        offspringChance: Math.random() * 0.05 + 0.01,
    }
 }

class Bunny {
    private static nextId: number = 1;
    public id: number = Bunny.nextId++;
    public dna: DNA;
    public stage: "baby" | "adult" | "elder";
    public x: number;
    public y: number;
    public isPregnant: boolean = false;
    public pregnancyProgress: number = 0;
    public thirst: number = Math.floor(Math.random() * 100);
    public hunger: number = Math.floor(Math.random() * 100);
    public happiness: number = 100;
    public age: number = 0;
    public isDead: boolean = false;
    public currentAction: string = "";
    public world: World;
    public neighbors: { neighbors: string[], neighborTilesCords: number[][], neighborTilesContent: number[] } = { neighbors: [], neighborTilesCords: [], neighborTilesContent: [] };
    public waterTile: number[] | null = null;
    public foodTile: number[] | null = null;

    private actions: any[] = [
        {
            name: 'DRINK',
            calculateUtility: (bunny: Bunny) => {
                bunny.waterTile = bunny.findTile("water");
                return bunny.waterTile ? bunny.getUrgency(bunny.thirst) : 0;
            },
            execute: (bunny: Bunny) => {
                bunny.move(bunny.waterTile);
                bunny.thirst = Math.max(0, bunny.thirst - bunny.dna.drinkAmount);
                bunny.world.consumeTile(bunny.waterTile![0], bunny.waterTile![1]);
            }
        },
        {
            name: 'WANDER',
            calculateUtility: () => 0.15, // Low constant baseline score so it always has something to do if idle
            execute: (bunny: Bunny) => {
                const cords = bunny.neighbors.neighborTilesCords;
                bunny.move(cords[Math.floor(Math.random() * cords.length)]);
            }
        },
        {
            name: 'EAT',
            calculateUtility: (bunny: Bunny) => {
                bunny.foodTile = bunny.findTile("grass");
                return bunny.foodTile ? bunny.getUrgency(bunny.hunger) : 0;
            },
            execute: (bunny: Bunny) => {
                bunny.move(bunny.foodTile);
                bunny.hunger = Math.max(0, bunny.hunger - bunny.dna.eatAmount);
                bunny.thirst = Math.max(0, bunny.thirst - bunny.dna.drinkAmount/2);
                bunny.world.consumeTile(bunny.foodTile![0], bunny.foodTile![1]);
            }
        }
    ]

    constructor(x: number, y: number, stage: "baby" | "adult" | "elder", world: World, dna: DNA = randomDna()) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.stage = stage;
        this.dna = dna;
    }

    toSnapshot() {
        return {
            id: this.id,
            gender: this.dna.gender,
            maxAge: this.dna.maxAge,
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

    // Helper curve: maps 0-100 to an exponential 0.0-1.0 urgency
    private getUrgency(value: number): number {
        const normalized = Math.max(0, Math.min(100, value)) / 100;
        return Math.pow(normalized, 2); // Exponential curve: low values stay low, high values spike
    }

    private findTile(type: string): number[] | null {
        let found: number[] | null = null;
        for (let i = 0; i < this.neighbors.neighbors.length; i++) {
            if (this.neighbors.neighbors[i] === type && this.neighbors.neighborTilesContent[i] > 0) {
                found = this.neighbors.neighborTilesCords[i];
            }
        }
        return found;
    }

    tick(): void {
        this.tickNeeds();
        if (Math.random() < this.dna.offspringChance && this.hunger < 50 && this.thirst < 50 && this.happiness > 50 && this.dna.gender === 1) {
            // create a dna copy
            const newDna = { ...this.dna };
            // variate the dna slightly
            // 2. Mutation: Randomly tweak genes to create genetic diversity
            for (const key of Object.keys(newDna) as (keyof DNA)[]) {
                if (key === "gender") continue;
                if (Math.random() < 0.15) {
                    // Apply a +/- 20% random mutation twist
                    const factor = 1 + (Math.random() * 0.4 - 0.2);
                    newDna[key] = Number((newDna[key] * factor).toFixed(2));
                }
            }
            newDna.gender = Math.random() < 0.5 ? 0 : 1;
            this.world.addBunny(new Bunny(this.x, this.y, "baby", this.world, newDna));
        }
        this.neighbors = this.world.getNeighbors(this.x, this.y);
    }

    tickNeeds(inertiaBonus: number = 0.1): void {
        const dna = this.dna;
        this.hunger = Math.min(100, this.hunger + dna.hungerRate);
        this.thirst = Math.min(100, this.thirst + dna.thirstRate);
        if (this.hunger > dna.distressThreshold || this.thirst > dna.distressThreshold) {
            this.happiness = Math.max(0, this.happiness - dna.happinessDecay);
            if (this.happiness <= 0) {
                this.isDead = true;
                return;
            }
        } else {
            this.happiness = Math.min(100, this.happiness + dna.happinessRecovery);
        }

        let bestAction = this.actions[0];
        let highestScore = -1;
        for (const action of this.actions) {
            let score = action.calculateUtility(this);
            // Inertia bonus on the current action prevents twitchy oscillations
            if (action.name === this.currentAction) score += inertiaBonus;
            if (score > highestScore) {
                highestScore = score;
                bestAction = action;
            }
        }
        this.currentAction = bestAction.name;
        bestAction.execute(this);

        this.age++;
        if (this.age < 10) this.stage = "baby";
        else if (this.age < 60) this.stage = "adult";
        else this.stage = "elder";
        if (this.age > this.dna.maxAge && Math.random() < 0.1) this.isDead = true;
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
        // neighbors.push(this.tiles[x][y]);
        // neighborTilesCords.push([x, y]);
        // neighborTilesContent.push(this.tilesContent[x][y]);
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
                    this.tilesContent[i][j] = this.tilesContent[i][j] > 0 ? Math.min(10, this.tilesContent[i][j] + 0.1) : 0;
                }
            }
        }
        for (const bunny of this.bunnies) bunny.tick();
        this.bunnies = this.bunnies.filter(bunny => !bunny.isDead);
    }
}

class Sim {
    public world: World = new World(3, 3, Math.floor(Math.random() * 1000));
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
                    for (let i = 0; i < 100; i++) {
                    this.world.addBunny(new Bunny(Math.floor(Math.random() * this.world.width), Math.floor(Math.random() * this.world.height), "adult", this.world, {...randomDna(),gender:1}));
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
            await new Promise(resolve => setTimeout(resolve, 60));
        }
    }

    history: { tick: number, avgHunger: number, avgThirst: number, avgHappiness: number, populationCount: number, avgAge: number }[] = [];
  maxHistoryLength = 1000;

  public record(tick: number, bunnies: Bunny[]) {
    if (bunnies.length === 0) return;

    let hunger = 0, thirst = 0, happiness = 0, age = 0;
    for (const bunny of bunnies) {
      hunger += bunny.hunger;
      thirst += bunny.thirst;
      happiness += bunny.happiness;
      age += bunny.age;
    }

    const count = bunnies.length;
    this.history.push({
      tick,
      avgHunger: hunger / count,
      avgThirst: thirst / count,
      avgHappiness: happiness / count,
      populationCount: count,
      avgAge: age / count,
    });
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

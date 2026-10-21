
const Node = require("../node");
const Cluster = require("../cluster");
const Network = require("../network");
const Simulator = require("../simulator");

const nodes = [new Node("A"), new Node("B"), new Node("C")];
const cluster = new Cluster(nodes);
const network = new Network();
const sim = new Simulator(cluster, network);

console.log("=== PART 10: HARDENING IMPLEMENTATION (LAG CATCH-UP) ===\n");

// 1. Elect A
sim.electLeader(nodes[0]);

// 2. C goes offline
nodes[2].fail();

// 3. A replicates entries
sim.replicate("x=1");
sim.replicate("y=2");
sim.replicate("z=3");

// 4. C comes back but is lagging
nodes[2].recover();
console.log("\n--- Monitoring Follower Lag ---");

const leader = cluster.leader();
const follower = nodes[2];
const LAG_THRESHOLD = 1;

let lag = leader.log.length - follower.log.length;
console.log(`Follower C lag = ${lag} entries`);

if (lag > LAG_THRESHOLD) {
    console.warn(`WARN: Follower C is lagging! Initiating catch-up...`);
    
    // Enhancement: Force catch-up
    while (follower.log.length < leader.log.length) {
        const missingEntry = leader.log[follower.log.length];
        follower.log.push(missingEntry);
        console.log(`Catch-up: Sent entry ${missingEntry.index} (${missingEntry.command}) to C`);
    }
    
    console.log("OK: Follower C has caught up.");
} else {
    console.log("OK: Follower lag is within limits.");
}

// 5. Verify
console.log("\n--- Final State ---");
nodes.forEach(n => {
  console.log(`${n.id}: ${n.log.map(e => e.command).join(", ") || "(empty)"}`);
});
const Node = require("../node");
const Cluster = require("../cluster");
const Network = require("../network");
const Simulator = require("../simulator");

const nodes = [new Node("A"), new Node("B"), new Node("C")];
const cluster = new Cluster(nodes);
const network = new Network();
const sim = new Simulator(cluster, network);

console.log("=== PART 8: LOG RECOVERY ===\n");

// 1. Elect A as leader
sim.electLeader(nodes[0]);
sim.heartbeat();

// 2. C fails before replication begins
console.log("\n--- C crashes ---");
nodes[2].fail();

// 3. Leader replicates entries while C is down
sim.replicate("x = 1");
sim.replicate("y = 2");
sim.replicate("z = 3");

// 4. Show divergence
console.log("\n--- Log state while C is down ---");
nodes.forEach(n => {
  console.log(`${n.id} (${n.role}): ${n.log.map(e => e.command).join(", ") || "(empty)"}`);
});

// 5. C recovers
console.log("\n--- C recovers ---");
nodes[2].recover();

// 6. Leader repairs C's log (simulated AppendEntries backtracking)
const leader = cluster.leader();
const follower = nodes[2];

console.log(`\nLeader ${leader.id} sends AppendEntries with prevLogIndex=${follower.log.length}, prevLogTerm=${follower.log.length ? follower.log[follower.log.length-1].term : 0}`);

// AppendEntries carries the full missing suffix (simplified)
while (follower.log.length < leader.log.length) {
  const missing = leader.log[follower.log.length];
  follower.log.push(missing);
  network.send(`AppendEntries(entries=[${missing.index}:${missing.command}])`);
}

console.log("\n--- Final logs ---");
nodes.forEach(n => {
  console.log(`${n.id}: ${n.log.map(e => `${e.index}:${e.command}`).join(" | ")}`);
});

// 7. Verify convergence
const converged = nodes.every(n =>
  JSON.stringify(n.log.map(e => e.command)) ===
  JSON.stringify(leader.log.map(e => e.command))
);
console.log(`\nLogs identical: ${converged}`);Get-Item scenarios\log_recovery.js | Select-Object Length
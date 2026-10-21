const Node = require("../node");
const Cluster = require("../cluster");
const Network = require("../network");
const Simulator = require("../simulator");

const nodes = [new Node("A"), new Node("B"), new Node("C"), new Node("D"), new Node("E")];
const cluster = new Cluster(nodes);
const network = new Network();
const sim = new Simulator(cluster, network);

console.log("=== PART 9: OPERATIONAL HARDENING ===\n");

// ---------- Check 1: Election timeout sanity ----------
console.log("--- 1. Election timeout validation ---");
const ELECTION_TIMEOUT_MS   = 150;
const HEARTBEAT_INTERVAL_MS = 50;

if (HEARTBEAT_INTERVAL_MS >= ELECTION_TIMEOUT_MS / 2) {
  console.warn("WARN: heartbeat interval too close to election timeout — risk of spurious elections");
} else {
  console.log("OK: heartbeat interval leaves margin for network jitter");
}

// ---------- Check 2: Leader churn detection ----------
console.log("\n--- 2. Leader churn detection ---");
const leaderHistory = []; 

for (let t = 1; t <= 4; t++) {
  const candidate = nodes[(t - 1) % 3]; 
  candidate.currentTerm = t;
  candidate.becomeCandidate();
  candidate.becomeLeader();
  leaderHistory.push({ leaderId: candidate.id, term: t });
  nodes.forEach(n => { if (n.id !== candidate.id) n.role = "FOLLOWER"; });
}

const uniqueLeaders = new Set(leaderHistory.map(h => h.leaderId)).size;
if (leaderHistory.length >= 3 && uniqueLeaders >= 3) {
  console.warn(`WARN: leader churn detected — ${leaderHistory.length} elections, ${uniqueLeaders} distinct leaders`);
} else {
  console.log("OK: leadership stable");
}

// ---------- Check 3: Majority health ----------
console.log("\n--- 3. Majority health monitoring ---");
console.log(`Cluster size = ${nodes.length}, majority required = ${cluster.majority()}`);

console.log(`Online: ${cluster.onlineNodes().length}, hasMajority: ${cluster.hasMajority()}`);

nodes[3].fail();
nodes[4].fail();
console.log(`Online: ${cluster.onlineNodes().length}, hasMajority: ${cluster.hasMajority()}`);
if (!cluster.hasMajority()) {
  console.warn("WARN: quorum lost — cluster cannot commit new entries or elect a leader");
}

// ---------- Check 4: Follower lag ----------
console.log("\n--- 4. Follower replication lag monitoring ---");
nodes.forEach(n => { n.role = "FOLLOWER"; n.currentTerm = 0; n.log = []; n.online = true; });
nodes[0].currentTerm = 5;
nodes[0].becomeCandidate();
nodes[0].becomeLeader();

sim.replicate("a=1");
sim.replicate("b=2");

nodes[2].log.pop(); // Simulate C lagging

nodes.forEach(n => {
  const lag = nodes[0].log.length - n.log.length;
  if (lag > 1) {
    console.warn(`WARN: follower ${n.id} is lagging by ${lag} entries`);
  } else {
    console.log(`OK: follower ${n.id} lag = ${lag}`);
  }
});

console.log("\n=== HARDENING CHECKS COMPLETE ===");
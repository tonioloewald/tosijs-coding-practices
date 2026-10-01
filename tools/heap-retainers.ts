#!/usr/bin/env bun
/**
 * heap-retainers — why is this object still alive?
 *
 *   bun tools/heap-retainers.ts <file.heapsnapshot> "<name regex>" [maxPaths]
 *
 * Prints the shortest strong-reference path from a GC root to each matching object
 * or native node (weak and shortcut edges skipped). Take the snapshot with CDP
 * (HeapProfiler.collectGarbage, then takeHeapSnapshot) after the thing should
 * have gone away. Minified names in the path map back through the bundle: grep
 * the bundle for the module-scope variable the path names.
 *
 * Found tosijs-3d#96 (an inputField leak through a never-pruned module Set) in
 * tosijs-3d-ensemble, 2026-10.
 */
import { readFileSync } from "node:fs";
const snap = JSON.parse(readFileSync(process.argv[2], "utf8"));
const m = snap.snapshot.meta;
const NF = m.node_fields.length, EF = m.edge_fields.length;
const nType = m.node_fields.indexOf("type"), nName = m.node_fields.indexOf("name"), nEdges = m.node_fields.indexOf("edge_count"), nId = m.node_fields.indexOf("id");
const eType = m.edge_fields.indexOf("type"), eName = m.edge_fields.indexOf("name_or_index"), eTo = m.edge_fields.indexOf("to_node");
const nodeTypes = m.node_types[nType], edgeTypes = m.edge_types[eType];
const nodes = snap.nodes, edges = snap.edges, strings = snap.strings;
const N = nodes.length / NF;
const firstEdge = new Uint32Array(N + 1);
for (let i = 0, e = 0; i < N; i++) { firstEdge[i] = e; e += nodes[i * NF + nEdges] * EF; firstEdge[i+1] = e; }
const name = (i: number) => strings[nodes[i * NF + nName]];
const type = (i: number) => nodeTypes[nodes[i * NF + nType]];
// BFS from root (node 0) over non-weak edges, recording parent edge
const prev = new Int32Array(N).fill(-1), prevEdge = new Int32Array(N).fill(-1);
const seen = new Uint8Array(N); const q = [0]; seen[0] = 1;
for (let h = 0; h < q.length; h++) {
  const n = q[h];
  for (let e = firstEdge[n]; e < firstEdge[n + 1]; e += EF) {
    const et = edgeTypes[edges[e + eType]];
    if (et === "weak" || et === "shortcut") continue;
    const to = edges[e + eTo] / NF;
    if (!seen[to]) { seen[to] = 1; prev[to] = n; prevEdge[to] = e; q.push(to); }
  }
}
const pattern = new RegExp(process.argv[3] ?? "EnsembleEditor");
const targets: number[] = [];
for (let i = 0; i < N; i++) if (pattern.test(name(i)) && seen[i] && (type(i) === "object" || type(i) === "native")) targets.push(i);
console.log("matches:", targets.length, targets.slice(0, 6).map((t) => `${type(t)}:${name(t).slice(0, 50)}`).join(" | "));
for (const t of targets.slice(0, Number(process.argv[4] ?? 2))) {
  const path: string[] = [];
  let n = t;
  while (n > 0 && path.length < 40) {
    const e = prevEdge[n];
    const et = edgeTypes[edges[e + eType]];
    const en = et === "element" || et === "hidden" ? `[${edges[e + eName]}]` : strings[edges[e + eName]];
    path.push(`${type(prev[n])}:${name(prev[n]).slice(0, 60)} --${et}:${String(en).slice(0, 40)}-->`);
    n = prev[n];
  }
  console.log("\n=== path to", type(t), name(t).slice(0, 60));
  console.log(path.reverse().join("\n"));
}

import { readFileSync } from "node:fs";

let indata = "";
for await (const del of process.stdin) indata += del;
const fil = JSON.parse(indata).tool_input?.file_path ?? "";

if (!fil.endsWith(".ts")) process.exit(0);

const rader = readFileSync(fil, "utf8").split("\n");
let hittat = false;
rader.forEach((rad, i) => {
  if (rad.includes("console.log")) {
    process.stderr.write(`${fil}:${i + 1}: console.log hittades. Ta bort raden.\n`);
    hittat = true;
  }
});

process.exit(hittat ? 2 : 0);
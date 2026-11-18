import { readdirSync, readFileSync, existsSync } from "node:fs";

if (!existsSync("sessions")) process.exit(0);

const filer = readdirSync("sessions")
  .map((f) => f.match(/^pass-(\d+)\.md$/))
  .filter(Boolean)
  .sort((a, b) => Number(a[1]) - Number(b[1]));
if (filer.length === 0) process.exit(0);

const senaste = filer[filer.length - 1][0];
console.log(`Senaste sessionsloggen (sessions/${senaste}):\n`);
console.log(readFileSync(`sessions/${senaste}`, "utf8"));
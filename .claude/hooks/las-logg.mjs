import { readdirSync, readFileSync, existsSync } from "node:fs";

if (!existsSync("sessions")) process.exit(0);

const filer = readdirSync("sessions")
  .filter((f) => f.endsWith(".md"))
  .sort();
if (filer.length === 0) process.exit(0);

const senaste = filer[filer.length - 1];
console.log(`Senaste sessionsloggen (sessions/${senaste}):\n`);
console.log(readFileSync(`sessions/${senaste}`, "utf8"));
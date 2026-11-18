import { readFileSync, readdirSync, writeFileSync } from "node:fs";

let indata = "";
for await (const del of process.stdin) indata += del;
const { transcript_path } = JSON.parse(indata);

const poster = readFileSync(transcript_path, "utf8")
  .split("\n").filter(Boolean).map((rad) => JSON.parse(rad));

const bad = poster
  .filter((p) => p.type === "user")
  .map((p) => p.message.content)
  .filter((t) => typeof t === "string")
  .map((t) => "- " + t.trim().split("\n")[0].slice(0, 100));
const filer = new Set(poster
  .flatMap((p) => (p.type === "assistant" ? p.message.content : []))
  .filter((c) => c.name === "Edit" || c.name === "Write")
  .map((c) => "- " + c.input.file_path));

const nummer = readdirSync("sessions")
  .map((f) => f.match(/^pass-(\d+)\.md$/))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const nr = nummer.length ? Math.max(...nummer) + 1 : 1;
const text = ["# Pass " + nr, "## Du bad om", ...bad,
  "## Ändrade filer", ...filer].join("\n");
writeFileSync(`sessions/pass-${nr}.md`, text);
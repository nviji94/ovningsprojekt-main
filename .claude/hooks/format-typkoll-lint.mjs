import { execSync } from "node:child_process";

let indata = "";
for await (const del of process.stdin) indata += del;
const fil = JSON.parse(indata).tool_input?.file_path ?? "";

if (!fil.endsWith(".ts")) process.exit(0);

execSync(`npx prettier --write "${fil}"`, { stdio: "ignore" });

try {
  execSync("npx tsc --noEmit", { stdio: "pipe" });
} catch (fel) {
  process.stderr.write(fel.stdout.toString());
  process.exit(2);
}
try {
  execSync(`npx eslint "${fil}"`, { stdio: "pipe" });
} catch (fel) {
  process.stderr.write(fel.stdout.toString());
  process.exit(2);
}
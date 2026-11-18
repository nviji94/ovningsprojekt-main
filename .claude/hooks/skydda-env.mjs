import { basename } from "node:path";

let indata = "";
for await (const del of process.stdin) indata += del;
const fil = JSON.parse(indata).tool_input?.file_path ?? "";

if (basename(fil) === ".env") {
  process.stderr.write("Blockerat: .env innehåller hemligheter. Ändra den för hand.\n");
  process.exit(2);
}
process.exit(0);
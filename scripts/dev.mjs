import { spawn } from "node:child_process";

const args = process.argv
  .slice(2)
  .filter((argument) => argument !== "--strictPort")
  .map((argument) => (argument === "--host" ? "--hostname" : argument));

const child = spawn("next", ["dev", ...args], { stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 1));

const { spawn } = require("child_process");

const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";

const children = [
  spawn(npm, ["run", "dev:api"], { stdio: "inherit", shell: false }),
  spawn(npm, ["run", "dev"], { stdio: "inherit", shell: false }),
];

let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code && code !== 0) {
      stopAll(code);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

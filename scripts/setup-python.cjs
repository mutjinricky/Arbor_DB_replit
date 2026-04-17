const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REQUIREMENTS = path.join(ROOT, "requirements.txt");

function pythonCandidates() {
  const fromEnv = process.env.PYTHON ? [process.env.PYTHON] : [];
  if (process.platform === "win32") {
    return [...fromEnv, "py", "python", "python3"];
  }
  return [...fromEnv, "python3", "python"];
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    shell: false,
  });
}

function findPython() {
  for (const command of pythonCandidates()) {
    const result = run(command, ["-c", "import sys; print(sys.version)"]);
    if (result.status === 0) {
      return command;
    }
  }
  throw new Error("Python 실행 파일을 찾지 못했습니다. Replit에 python-3.11 모듈이 필요합니다.");
}

function hasPypdf(python) {
  const result = run(python, ["-c", "import pypdf"]);
  return result.status === 0;
}

const python = findPython();

if (hasPypdf(python)) {
  console.log(`pypdf already installed for ${python}`);
  process.exit(0);
}

console.log(`Installing Python dependencies with ${python}`);
const install = run(python, ["-m", "pip", "install", "--user", "-r", REQUIREMENTS], {
  stdio: "inherit",
});

if (install.status !== 0) {
  process.exit(install.status || 1);
}

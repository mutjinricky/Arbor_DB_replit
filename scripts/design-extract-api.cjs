const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const app = express();
const serveStatic = process.argv.includes("--serve-static");
const PORT = Number(process.env.PORT || (serveStatic ? 5000 : process.env.DESIGN_EXTRACT_API_PORT || 5174));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const UPLOAD_DIR = process.env.DESIGN_UPLOAD_DIR || path.join(os.tmpdir(), "smart-tree-design-documents");
const CHUNK_DIR = path.join(UPLOAD_DIR, "chunks");
const EXTRACTOR = path.join(ROOT, "scripts", "extract_tree_design_pdf.py");
const REQUIREMENTS = path.join(ROOT, "requirements.txt");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(CHUNK_DIR, { recursive: true });

app.use(express.json({ limit: "80mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

function safeFileName(name) {
  const ext = path.extname(name || "").toLowerCase();
  const base = path.basename(name || "design-document", ext).replace(/[^\w.-]+/g, "_").slice(0, 80);
  return `${Date.now()}_${base || "design-document"}${ext || ".pdf"}`;
}

function safeId(value) {
  return String(value || "").replace(/[^\w.-]+/g, "_").slice(0, 120);
}

function ensureSupportedFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (![".pdf", ".txt", ".md"].includes(ext)) {
    throw new Error("PDF, TXT, MD 파일만 지원합니다.");
  }
}

function pythonCandidates() {
  const candidates = [];
  if (process.env.PYTHON) candidates.push(process.env.PYTHON);
  if (process.platform === "win32") {
    candidates.push("py", "python", "python3");
  } else {
    candidates.push("python3", "python");
  }
  return [...new Set(candidates)];
}

function runSync(command, args) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
}

function findPython() {
  const errors = [];
  for (const command of pythonCandidates()) {
    const result = runSync(command, ["-c", "import sys; print(sys.executable)"]);
    if (result.status === 0) {
      return command;
    }
    errors.push(`${command}: ${(result.stderr || result.error?.message || "failed").trim()}`);
  }
  throw new Error(`Python 실행 파일을 찾지 못했습니다. ${errors.join(" | ")}`);
}

function hasPypdf(python) {
  return runSync(python, ["-c", "import pypdf"]).status === 0;
}

function installPythonDependencies(python) {
  const result = spawnSync(python, ["-m", "pip", "install", "--user", "-r", REQUIREMENTS], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || result.error?.message || "").trim();
    throw new Error(`Python PDF 추출 의존성 설치에 실패했습니다. ${detail}`);
  }
}

function runPythonExtractor(filePath, python) {
  return new Promise((resolve, reject) => {
    const child = spawn(python, [EXTRACTOR, filePath], {
      cwd: ROOT,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const firstJsonLine = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .find((line) => line.startsWith("{"));

      if (!firstJsonLine) {
        reject(new Error(`추출기 응답을 읽지 못했습니다. python=${python}, code=${code}, stderr=${stderr || "empty"}`));
        return;
      }

      try {
        const parsed = JSON.parse(firstJsonLine);
        if (code !== 0 || parsed.ok === false) {
          reject(new Error(parsed.error || stderr || "PDF 추출에 실패했습니다."));
          return;
        }
        if (stderr.trim()) {
          parsed.warnings = [...(parsed.warnings || []), stderr.trim()];
        }
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function runExtractor(filePath) {
  const python = findPython();
  try {
    if (!hasPypdf(python)) {
      installPythonDependencies(python);
    }
    return await runPythonExtractor(filePath, python);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("pypdf")) {
      throw error;
    }

    installPythonDependencies(python);
    return runPythonExtractor(filePath, python);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "design-extract-api" });
});

app.get("/api/design-documents/diagnostics", (_req, res) => {
  const diagnostics = {
    ok: true,
    node: process.version,
    platform: process.platform,
    root: ROOT,
    uploadDir: UPLOAD_DIR,
    uploadDirExists: fs.existsSync(UPLOAD_DIR),
    extractorExists: fs.existsSync(EXTRACTOR),
    requirementsExists: fs.existsSync(REQUIREMENTS),
    python: [],
  };

  for (const command of pythonCandidates()) {
    const version = runSync(command, ["--version"]);
    const pypdf = runSync(command, ["-c", "import pypdf; print(pypdf.__version__)"]);
    diagnostics.python.push({
      command,
      versionOk: version.status === 0,
      version: (version.stdout || version.stderr || "").trim(),
      pypdfOk: pypdf.status === 0,
      pypdf: (pypdf.stdout || pypdf.stderr || pypdf.error?.message || "").trim(),
    });
  }

  res.json(diagnostics);
});

app.post("/api/design-documents/extract", async (req, res) => {
  try {
    const { fileName, contentBase64 } = req.body || {};
    if (!fileName || !contentBase64) {
      res.status(400).json({ ok: false, error: "fileName과 contentBase64가 필요합니다." });
      return;
    }

    ensureSupportedFile(fileName);

    const savedPath = path.join(UPLOAD_DIR, safeFileName(fileName));
    fs.writeFileSync(savedPath, Buffer.from(contentBase64, "base64"));

    const result = await runExtractor(savedPath);
    res.json(result);
  } catch (error) {
    console.error("[design-extract] extract failed", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "추출 중 오류가 발생했습니다.",
    });
  }
});

app.post("/api/design-documents/extract-chunk", async (req, res) => {
  try {
    const { uploadId, fileName, contentBase64 } = req.body || {};
    const chunkIndex = Number(req.body?.chunkIndex);
    const totalChunks = Number(req.body?.totalChunks);

    if (!uploadId || !fileName || !contentBase64 || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks)) {
      res.status(400).json({ ok: false, error: "chunk 업로드 정보가 올바르지 않습니다." });
      return;
    }
    if (chunkIndex < 0 || totalChunks < 1 || chunkIndex >= totalChunks) {
      res.status(400).json({ ok: false, error: "chunk 순서 정보가 올바르지 않습니다." });
      return;
    }

    ensureSupportedFile(fileName);

    const uploadDir = path.join(CHUNK_DIR, safeId(uploadId));
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, `${String(chunkIndex).padStart(6, "0")}.part`), Buffer.from(contentBase64, "base64"));

    if (chunkIndex < totalChunks - 1) {
      res.json({ ok: true, done: false, received: chunkIndex + 1, totalChunks });
      return;
    }

    const savedPath = path.join(UPLOAD_DIR, safeFileName(fileName));
    const output = fs.createWriteStream(savedPath);

    for (let index = 0; index < totalChunks; index += 1) {
      const chunkPath = path.join(uploadDir, `${String(index).padStart(6, "0")}.part`);
      if (!fs.existsSync(chunkPath)) {
        output.close();
        res.status(400).json({ ok: false, error: `${index + 1}번째 파일 조각이 누락되었습니다.` });
        return;
      }
      output.write(fs.readFileSync(chunkPath));
    }

    await new Promise((resolve, reject) => {
      output.end(resolve);
      output.on("error", reject);
    });

    fs.rmSync(uploadDir, { recursive: true, force: true });

    const result = await runExtractor(savedPath);
    res.json({ ...result, done: true });
  } catch (error) {
    console.error("[design-extract] extract-chunk failed", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "추출 중 오류가 발생했습니다.",
    });
  }
});

if (serveStatic) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Design extract server listening on http://localhost:${PORT}`);
  if (serveStatic) {
    console.log(`Serving static app from ${DIST_DIR}`);
  }
});

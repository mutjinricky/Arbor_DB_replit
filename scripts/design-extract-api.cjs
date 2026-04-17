const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const app = express();
const serveStatic = process.argv.includes("--serve-static");
const PORT = Number(process.env.PORT || (serveStatic ? 5000 : process.env.DESIGN_EXTRACT_API_PORT || 5174));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const UPLOAD_DIR = path.join(ROOT, ".tmp", "design-documents");
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

function installPythonDependencies(python) {
  const result = spawnSync(python, ["-m", "pip", "install", "--user", "-r", REQUIREMENTS], {
    cwd: ROOT,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error("Python PDF 추출 의존성 설치에 실패했습니다.");
  }
}

function runPythonExtractor(filePath) {
  const python = process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");

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
        reject(new Error(stderr || "추출기 응답을 읽지 못했습니다."));
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
  try {
    return await runPythonExtractor(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("pypdf")) {
      throw error;
    }

    const python = process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
    installPythonDependencies(python);
    return runPythonExtractor(filePath);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "design-extract-api" });
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

const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = Number(process.env.DESIGN_EXTRACT_API_PORT || 5174);
const ROOT = path.resolve(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, ".tmp", "design-documents");
const EXTRACTOR = path.join(ROOT, "scripts", "extract_tree_design_pdf.py");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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

function runExtractor(filePath) {
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

    const ext = path.extname(fileName).toLowerCase();
    if (![".pdf", ".txt", ".md"].includes(ext)) {
      res.status(400).json({ ok: false, error: "PDF, TXT, MD 파일만 지원합니다." });
      return;
    }

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

app.listen(PORT, () => {
  console.log(`Design extract API listening on http://localhost:${PORT}`);
});

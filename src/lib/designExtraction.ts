export interface DesignExtractionPayload {
  businessName: string | null;
  designer: string | null;
  year: number | null;
  region: string | null;
  location: string | null;
  businessTypes: string[];
  durationText: string | null;
  durationDays: number | null;
  totalBudget: number | null;
  totalTreeCount: number | null;
}

export interface DesignExtractionResponse {
  ok: boolean;
  fileName: string;
  textLength: number;
  warnings?: string[];
  extracted: DesignExtractionPayload;
}

const UPLOAD_CHUNK_SIZE = 96 * 1024;
const MAX_JOB_POLLS = 180;

function makeUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { error: text ? text.slice(0, 500) : "" };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollExtractionJob(jobId: string): Promise<DesignExtractionResponse> {
  for (let attempt = 0; attempt < MAX_JOB_POLLS; attempt += 1) {
    const response = await fetch(`/api/design-documents/jobs/${encodeURIComponent(jobId)}`);
    const data = await readJsonResponse(response);

    if (!response.ok || !data) {
      throw new Error(data?.error || `사업설계서 추출 상태 확인에 실패했습니다. (${response.status})`);
    }

    if (data.status === "failed" || data.ok === false) {
      throw new Error(data.error || "사업설계서 추출에 실패했습니다.");
    }

    if (data.done) {
      return data as DesignExtractionResponse;
    }

    await wait(1000);
  }

  throw new Error("사업설계서 추출 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
}

export async function extractDesignDocument(file: File): Promise<DesignExtractionResponse> {
  const uploadId = makeUploadId();
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * UPLOAD_CHUNK_SIZE;
    const end = Math.min(file.size, start + UPLOAD_CHUNK_SIZE);
    const params = new URLSearchParams({
      uploadId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      chunkIndex: String(chunkIndex),
      totalChunks: String(totalChunks),
    });

    const response = await fetch(`/api/design-documents/upload-chunk?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file.slice(start, end),
    });

    const data = await readJsonResponse(response);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || `사업설계서 추출에 실패했습니다. (${response.status})`);
    }

    if (data.jobId) {
      return pollExtractionJob(data.jobId);
    }
  }

  throw new Error("사업설계서 추출 결과를 받지 못했습니다.");
}

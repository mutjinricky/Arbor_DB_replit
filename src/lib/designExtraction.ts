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

const UPLOAD_CHUNK_SIZE = 512 * 1024;

function makeUploadId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const step = 0x8000;

  for (let i = 0; i < bytes.length; i += step) {
    const chunk = bytes.subarray(i, i + step);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { error: text };
  }
}

export async function extractDesignDocument(file: File): Promise<DesignExtractionResponse> {
  const uploadId = makeUploadId();
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * UPLOAD_CHUNK_SIZE;
    const end = Math.min(file.size, start + UPLOAD_CHUNK_SIZE);
    const contentBase64 = arrayBufferToBase64(await file.slice(start, end).arrayBuffer());

    const response = await fetch("/api/design-documents/extract-chunk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        chunkIndex,
        totalChunks,
        contentBase64,
      }),
    });

    const data = await readJsonResponse(response);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || `사업설계서 추출에 실패했습니다. (${response.status})`);
    }

    if (data.done) {
      return data as DesignExtractionResponse;
    }
  }

  throw new Error("사업설계서 추출 결과를 받지 못했습니다.");
}

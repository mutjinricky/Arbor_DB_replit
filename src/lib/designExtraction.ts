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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export async function extractDesignDocument(file: File): Promise<DesignExtractionResponse> {
  const contentBase64 = await fileToBase64(file);
  const response = await fetch("/api/design-documents/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "사업설계서 추출에 실패했습니다.");
  }

  return data as DesignExtractionResponse;
}

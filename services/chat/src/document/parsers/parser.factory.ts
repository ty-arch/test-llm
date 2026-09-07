import { DOCX_MIME_TYPES, DocxParser } from "./docx.parser";
import { PDF_MIME_TYPES, PdfParser } from "./pdf.parser";
import { TEXT_MIME_TYPES, TextParser } from "./text.parser";

// 该 MIME 类型（或具体文件）当前无法解析。
export class UnsupportedFormatError extends Error {
  constructor(mimeType: string) {
    super(`暂不支持解析的文件类型: ${mimeType}`);
    this.name = "UnsupportedFormatError";
  }
}

// 按 MIME 类型路由到对应解析器，返回解析出的纯文本。
export async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (TEXT_MIME_TYPES.includes(mimeType)) {
    return new TextParser().extract(filePath);
  }
  if (PDF_MIME_TYPES.includes(mimeType)) {
    return new PdfParser().extract(filePath);
  }
  if (DOCX_MIME_TYPES.includes(mimeType)) {
    return new DocxParser().extract(filePath);
  }
  throw new UnsupportedFormatError(mimeType);
}

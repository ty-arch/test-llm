import { readFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";

// PDF 允许的 MIME。
export const PDF_MIME_TYPES: string[] = ["application/pdf"];

// PDF 解析器：用 pdf-parse v2 的类式 API 抽取文本。
export class PdfParser {
  async extract(filePath: string): Promise<string> {
    const parser = new PDFParse({ data: readFileSync(filePath) });
    try {
      const { text } = await parser.getText();
      return text;
    } finally {
      // 释放 pdf.js worker，避免句柄泄漏。
      await parser.destroy().catch(() => undefined);
    }
  }
}

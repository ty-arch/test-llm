import { readFileSync } from "node:fs";

// TXT / Markdown 允许的 MIME。
export const TEXT_MIME_TYPES: string[] = ["text/plain", "text/markdown", "text/x-markdown"];

// TXT / Markdown 解析器：按 UTF-8 直接读取为文本。
export class TextParser {
  async extract(filePath: string): Promise<string> {
    return readFileSync(filePath, "utf8");
  }
}

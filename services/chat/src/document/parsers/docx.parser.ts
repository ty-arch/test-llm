import { readFileSync } from "node:fs";
import mammoth from "mammoth";
import { UnsupportedFormatError } from "./parser.factory";

// Word 允许的 MIME。application/msword 可能是旧二进制 .doc（非 zip），
// 无法用 mammoth 解析，交给 extract 内的魔数校验兜底。
export const DOCX_MIME_TYPES: string[] = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
];

// DOCX 容器（PK zip）魔数。
const PK_ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// DOCX 解析器：用 mammoth 抽取 docx 纯文本。
export class DocxParser {
  async extract(filePath: string): Promise<string> {
    const buffer = readFileSync(filePath);
    const isZip = buffer.length >= 4 && buffer.subarray(0, 4).equals(PK_ZIP_SIGNATURE);
    if (!isZip) {
      // 旧二进制 .doc（OLE）不是 zip 容器，mammoth 无法处理。
      throw new UnsupportedFormatError("application/msword");
    }
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
}

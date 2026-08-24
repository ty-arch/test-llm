import { Body, Controller, Post } from "@nestjs/common";
import { FilesystemService } from "./filesystem.service";

@Controller("api/files")
export class FilesController {
  constructor(private readonly filesystemService: FilesystemService) {}

  // 模型按需调用工具读写 workspace/ 下的文件。
  @Post("chat")
  async chat(@Body() body: { input: string }) {
    return this.filesystemService.chat(body.input);
  }
}

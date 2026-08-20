import { Injectable } from "@nestjs/common";
import { APP_NAME } from "@autix/contracts";

@Injectable()
export class AppService {
  health() {
    return { ok: true };
  }

  hello() {
    return { message: `Hello from Chat, shared APP_NAME=${APP_NAME}` };
  }
}

// 三种路由的统一输入：不传时使用默认输入。
export class ChatDto {
  input?: string;
}

export class BatchChatDto {
  inputs?: string[];
}

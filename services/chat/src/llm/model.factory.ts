import { ChatOpenAI } from "@langchain/openai";
import { getApiKeys, loadLangChainConfig } from "../config/load-langchain-config";

// 统一模型工厂：不要在业务代码里直接 new ChatOpenAI，一律从这里取。
export function createChatModel(): ChatOpenAI {
  const { llm } = loadLangChainConfig();
  const keys = getApiKeys();

  return new ChatOpenAI({
    model: llm.model,
    temperature: llm.temperature,
    maxTokens: llm.maxTokens,
    timeout: llm.timeout,
    apiKey: keys.openaiApiKey,
    // baseURL 为空时交给 OpenAI SDK 用默认地址，避免空字符串覆盖默认值
    ...(keys.openaiBaseUrl ? { configuration: { baseURL: keys.openaiBaseUrl } } : {}),
  });
}

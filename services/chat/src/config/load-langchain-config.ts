import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";

// LangChain 运行参数（密钥不在此文件，统一走 getApiKeys()）
export interface LangChainConfig {
  llm: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens?: number;
    timeout?: number;
  };
  retrieval: {
    topK: number;
    scoreThreshold: number;
  };
  tools: {
    enabled: boolean;
  };
  features: {
    stream: boolean;
    batch: boolean;
  };
}

export interface ApiKeys {
  openaiApiKey: string;
  openaiBaseUrl: string;
  embeddingApiKey: string;
  vectorDbUrl: string;
  vectorDbApiKey: string;
}

const CONFIG_PATH = join(__dirname, "../../config/langchain.yaml");

let cached: LangChainConfig | null = null;

export function loadLangChainConfig(): LangChainConfig {
  if (!cached) {
    cached = load(readFileSync(CONFIG_PATH, "utf8")) as LangChainConfig;
  }
  return cached;
}

// 令牌/密钥/服务地址一律从 process.env 读取（由 `bun --env-file=.env` 注入）。
export function getApiKeys(): ApiKeys {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "",
    embeddingApiKey: process.env.EMBEDDING_API_KEY ?? "",
    vectorDbUrl: process.env.VECTOR_DB_URL ?? "",
    vectorDbApiKey: process.env.VECTOR_DB_API_KEY ?? "",
  };
}

import axios from "axios";
import rawCndPromptConfig from "./cnd-prompt.json" with { type: "json" };
import rawFornecedorPromptConfig from "./fornecedor-prompt.json" with { type: "json" };
import { promptConfigSchema } from "../schemas/deepseek.js";

export const cndPromptConfig = promptConfigSchema.parse(rawCndPromptConfig);
export const fornecedorPromptConfig = promptConfigSchema.parse(
  rawFornecedorPromptConfig,
);

export const deepseekClient = axios.create({
  baseURL: "https://api.deepseek.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});

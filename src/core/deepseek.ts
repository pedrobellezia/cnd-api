import axios from "axios";
import rawPromptConfig from "./deepseek-prompt.json" with { type: "json" };
import { promptConfigSchema } from "../schemas/deepseek.js";

export const promptConfig = promptConfigSchema.parse(rawPromptConfig);


export const deepseekClient = axios.create({
  baseURL: "https://api.deepseek.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});

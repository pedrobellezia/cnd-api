import { PDFParse } from "pdf-parse";
import { deepseek } from "./axios.js";
import { DateTime } from "luxon";
import promptConfig from "./deepseek-prompt.json" with { type: "json" };

import fs from "fs/promises";
import crypto from "crypto";
import path from "path";

export type CndExtracted = {
  cnpj: string;
  emissao: string | null;
  validade: string | null;
  tipo: string;
  status: string;
};

export class DeepSeekError extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name;

    Object.setPrototypeOf(this, DeepSeekError.prototype);
  }
}

export async function processBuffer(buffer: Buffer): Promise<CndExtracted> {
  const parser = new PDFParse(new Uint8Array(buffer));
  const { text } = await parser.getText();

  if (!text?.trim()) {
    throw new DeepSeekError("PDF vazio ou ilegível", "DeepSeekError");
  }

  const response = await deepseek.post("/chat/completions", {
    model: promptConfig.model,
    temperature: promptConfig.temperature,
    response_format: promptConfig.response_format,
    messages: [
      { role: "system", content: promptConfig.system },
      { role: "user", content: text },
    ],
  });
  const parsed = JSON.parse(response.data.choices[0].message.content);

  if (!parsed.success) {
    throw new DeepSeekError(parsed.error, "DeepSeekError");
  }

  if (
    new Date(parsed.data.validade) < DateTime.now().setZone("America/Sao_Paulo").toJSDate() &&
    parsed.data.status.toLowerCase() === "regular"
  ) {
    throw new DeepSeekError("CND vencida", "DeepSeekError");
  }

  const data = parsed.data;
  return {
    cnpj: data.cnpj,
    emissao: data.emissao,
    validade: data.validade,
    tipo: data.tipo,
    status: data.status,
  };
}

async function savePdf(buffer: Buffer): Promise<string> {
  const filename = `${crypto.randomBytes(8).toString("hex")}.pdf`;
  const filepath = path.join("public", filename);

  await fs.writeFile(filepath, buffer);

  return filename;
}

export default processBuffer;
export { savePdf };

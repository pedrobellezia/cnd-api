import { PDFParse } from "pdf-parse";
import { DateTime } from "luxon";
import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import {
  AppError,
  AppErrorType,
  PdfError,
  PdfErrorType,
} from "../errors/custom-errors.js";
import { DeepSeekService } from "./deepseek.js";

export type CndExtracted = {
  cnpj: string;
  emissao: string | null;
  validade: string | null;
  tipo: string;
  status: string;
};

export type FornecedorExtracted = {
  cnpj: string;
  name: string;
  uf: string;
  municipio: string;
};

export class PdfService {
  static async extractTextFromPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      standardFontDataUrl: path.join(
        process.cwd(),
        "node_modules/pdfjs-dist/standard_fonts/",
      ),
    });
    let text: string;
    try {
      const parsedPdf = await parser.getText();
      text = parsedPdf.text;
    } finally {
      await parser.destroy();
    }

    if (!text?.trim()) {
      throw new PdfError(
        PdfErrorType.EMPTY_OR_UNREADABLE,
        "PDF vazio ou ilegível",
      );
    }

    return text;
  }

  static async extractFornecedorData(
    buffer: Buffer,
  ): Promise<FornecedorExtracted> {
    const text = await this.extractTextFromPdf(buffer);

    return DeepSeekService.analyzeFornecedorText(text);
  }

  static async extractCndData(buffer: Buffer): Promise<CndExtracted> {
    const text = await this.extractTextFromPdf(buffer);

    const extracted = await DeepSeekService.analyzeCndText(text);

    const validade = DateTime.fromISO(extracted.validade ?? "", {
      zone: "America/Sao_Paulo",
    });

    if (
      validade.isValid &&
      validade < DateTime.now().setZone("America/Sao_Paulo") &&
      extracted.status.toLowerCase() === "regular"
    ) {
      throw new AppError(AppErrorType.EXPIRED_CND, "CND vencida");
    }

    return extracted;
  }
  static async savePdf(buffer: Buffer): Promise<string> {
    const filename = `${crypto.randomBytes(8).toString("hex")}.pdf`;
    const filepath = path.join("public", filename);

    await fs.mkdir("public", { recursive: true });
    await fs.writeFile(filepath, buffer);

    return filename;
  }
}

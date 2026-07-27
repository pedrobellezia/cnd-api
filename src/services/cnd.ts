import { prisma } from "../core/database.js";
import { logger } from "../core/logger.js";
import { DateTime } from "luxon";
import { AppError, AppErrorType } from "../errors/custom-errors.js";
import { PdfExtractorService } from "./pdf-extractor.js";
import { NewCndInput, newCndSchema } from "../schemas/cnd.js";
import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import { normalizeCnpj } from "../utils/normalize.js";

export interface ProcessFileResult {
  file: string;
  success: boolean;
  error?:
    | {
        type: string;
        message: string;
        details?: Record<string, unknown>;
      }
    | string;
  data?: {
    fornecedor: {
      name: string;
      cnpj: string;
    };
    cnd: {
      filename: string | null;
      validade: Date | null;
      emissao: Date | null;
      status: string;
      tipo: string;
    };
  };
}

export class CndService {
  static async savePdf(buffer: Buffer): Promise<string> {
    const filename = `${crypto.randomBytes(8).toString("hex")}.pdf`;
    const filepath = path.join("public", filename);

    await fs.mkdir("public", { recursive: true });
    await fs.writeFile(filepath, buffer);

    return filename;
  }

  static async newCnd(data: NewCndInput) {
    const cndType = await prisma.cndtype.findUnique({
      where: { id: data.cndtypeid },
      select: { id: true, name: true },
    });

    if (!cndType) {
      throw new AppError(
        AppErrorType.NOT_FOUND,
        `Tipo de CND com id "${data.cndtypeid}" não encontrado`,
      );
    }

    let validade: Date | null = null;
    let emissao: Date | null = null;

    if (data.validade) {
      validade = DateTime.fromISO(data.validade, { zone: "America/Sao_Paulo" })
        .endOf("day")
        .toJSDate();
    }

    if (data.emissao) {
      emissao = DateTime.fromISO(data.emissao, { zone: "America/Sao_Paulo" })
        .startOf("day")
        .toJSDate();
    }

    const createdCnd = await prisma.cnd.create({
      data: {
        fornecedorid: data.fornecedorid,
        file_name: data.file_name,
        validade: validade,
        emissao: emissao,
        status: data.status,
        cndtypeid: data.cndtypeid,
      },
      include: {
        cndtype: {
          select: {
            name: true,
          },
        },
      },
    });

    logger.info(
      {
        context: "CndService.newCnd",
        fornecedorid: data.fornecedorid,
        cnpj: data.cnpj,
        tipo: cndType.name,
        validade: createdCnd.validade,
      },
      "CND criada com sucesso",
    );

    return createdCnd;
  }

  static async getCndTypeIdByName(name: string) {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      return null;
    }

    return prisma.cndtype.findFirst({
      where: {
        name: {
          equals: normalizedName,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  static async processFiles(
    file: Express.Multer.File,
  ): Promise<ProcessFileResult> {
    try {
      const pdfBuffer = file.buffer;
      const extracted = await PdfExtractorService.extractCndData(pdfBuffer);

      if (!extracted.cnpj) {
        throw new AppError(
          AppErrorType.VALIDATION_ERROR,
          "CNPJ não encontrado no PDF",
        );
      }
      const normalizedCnpj = normalizeCnpj(extracted.cnpj);

      const fornecedor = await prisma.fornecedor.findUnique({
        where: { cnpj: normalizedCnpj },
      });

      if (!fornecedor) {
        throw new AppError(
          AppErrorType.NOT_FOUND,
          "O fornecedor associado a esta CND não foi encontrado no banco de dados.",
        );
      }

      const cndType = await this.getCndTypeIdByName(extracted.tipo);

      if (!cndType) {
        throw new AppError(
          AppErrorType.VALIDATION_ERROR,
          `Tipo de CND não suportado ("${extracted.tipo}")`,
        );
      }

      const fileName = await this.savePdf(pdfBuffer);

      const validatedData = await newCndSchema.parseAsync({
        fornecedorid: fornecedor.id,
        cnpj: fornecedor.cnpj,
        cndtypeid: cndType.id,
        file_name: fileName,
        validade: extracted.validade ?? undefined,
        emissao: extracted.emissao ?? undefined,
        status: extracted.status,
      });

      const cnd = await this.newCnd(validatedData);

      return {
        file: file.originalname,
        success: true,
        data: {
          fornecedor: {
            name: fornecedor.name,
            cnpj: fornecedor.cnpj,
          },
          cnd: {
            filename: cnd.file_name,
            validade: cnd.validade,
            emissao: cnd.emissao,
            status: cnd.status,
            tipo: cndType.name,
          },
        },
      };
    } catch (err: unknown) {
      logger.error(
        {
          context: "CndService.processFiles",
          file: file.originalname,
          error: err instanceof Error ? err.message : String(err),
        },
        `Erro no processamento da CND`,
      );
      throw err;
    }
  }
}
export default CndService;

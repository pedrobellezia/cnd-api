import { prisma } from "../core/database.js";
import { logger } from "../core/logger.js";
import { DateTime } from "luxon";
import { AppError, AppErrorType } from "../errors/custom-errors.js";
import { PdfService } from "./pdf.js";
import { NewCndInput, newCndSchema, SearchCndInput } from "../schemas/cnd.js";

import { normalizeCnpj } from "../utils/normalize.js";

function startOfDaySp(iso?: string): Date | undefined {
  if (!iso) return undefined;
  return DateTime.fromISO(iso, { zone: "America/Sao_Paulo" })
    .startOf("day")
    .toJSDate();
}

function endOfDaySp(iso?: string): Date | undefined {
  if (!iso) return undefined;
  return DateTime.fromISO(iso, { zone: "America/Sao_Paulo" })
    .endOf("day")
    .toJSDate();
}

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

  static async searchCnds(filters: SearchCndInput) {
    const fornecedorFilter: Record<string, unknown> = {};
    if (filters.cnpj) {
      fornecedorFilter.cnpj = { in: filters.cnpj };
    }
    if (filters.name) {
      fornecedorFilter.name = {
        contains: filters.name,
        mode: "insensitive" as const,
      };
    }

    const where = {
      ...(Object.keys(fornecedorFilter).length > 0 && {
        fornecedor: fornecedorFilter,
      }),
      ...(filters.status && { status: { in: filters.status } }),
      ...(filters.tipo && {
        OR: filters.tipo.map((tipo) => ({
          cndtype: { name: { equals: tipo, mode: "insensitive" as const } },
        })),
      }),
      ...((filters.emissaoDe || filters.emissaoAte) && {
        emissao: {
          ...(filters.emissaoDe && { gte: startOfDaySp(filters.emissaoDe) }),
          ...(filters.emissaoAte && { lte: endOfDaySp(filters.emissaoAte) }),
        },
      }),
      ...((filters.validadeDe || filters.validadeAte) && {
        validade: {
          ...(filters.validadeDe && {
            gte: startOfDaySp(filters.validadeDe),
          }),
          ...(filters.validadeAte && { lte: endOfDaySp(filters.validadeAte) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.cnd.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
        include: {
          fornecedor: { select: { name: true, cnpj: true } },
          cndtype: { select: { name: true } },
        },
      }),
      prisma.cnd.count({ where }),
    ]);

    return {
      data,
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
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
    const pdfBuffer = file.buffer;
    const extracted = await PdfService.extractCndData(pdfBuffer);

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

    const fileName = await PdfService.savePdf(pdfBuffer);

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
  }
}
export default CndService;

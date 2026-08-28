import { prisma } from "../core/database.js";
import { logger } from "../core/logger.js";
import { AppError, AppErrorType } from "../errors/custom-errors.js";
import {
  NewFornecedorInput,
  SearchFornecedorInput,
} from "../schemas/fornecedor.js";

export class FornecedorService {
  static async createFornecedor(data: NewFornecedorInput) {
    logger.info(
      {
        context: "FornecedorService.createFornecedor",
        cnpj: data.cnpj,
        name: data.name,
      },
      "Iniciando criação de novo fornecedor",
    );

    const exist = await prisma.fornecedor.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (exist) {
      throw new AppError(
        AppErrorType.CONFLICT,
        `Fornecedor com CNPJ "${data.cnpj}" já existe.`,
      );
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        cnpj: data.cnpj,
        name: data.name,
        uf: data.uf,
        municipio: data.municipio,
      },
    });

    logger.info(
      { context: "FornecedorService.createFornecedor", id: fornecedor.id },
      "Fornecedor criado com sucesso",
    );

    return fornecedor;
  }

  static async listFornecedores(filters: SearchFornecedorInput) {
    const where = {
      cnpj: filters.cnpj,
      uf: filters.uf,
      municipio: filters.municipio,
      ...(filters.name && {
        name: { contains: filters.name, mode: "insensitive" as const },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.fornecedor.findMany({
        where,
        skip: filters.skip,
        take: filters.limit,
        orderBy: { name: "asc" },
      }),
      prisma.fornecedor.count({ where }),
    ]);

    return {
      data,
      skip: filters.skip,
      limit: filters.limit,
      total,
    };
  }

  static async getFornecedorWithCnds(cnpj: string) {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT f.name,
             f.cnpj,
             f.uf,
             f.municipio,
             ct.name AS tipo,
             c.file_name,
             c.validade,
             c.emissao,
             c.status
      FROM "fornecedor" f
               CROSS JOIN "cndtype" ct
               LEFT JOIN LATERAL (
          SELECT *
          FROM "cnd" c
          WHERE c."fornecedorid" = f.id
            AND c."cndtypeid" = ct.id
          ORDER BY CASE
                       WHEN c.status = 'regular'
                           AND c.validade IS NOT NULL
                           AND c.validade >= NOW()
                           THEN 0
                       ELSE 1
                       END,

                   CASE
                       WHEN c.status = 'regular'
                           AND c.validade IS NOT NULL
                           AND c.validade >= NOW()
                           THEN c.validade
                       ELSE NULL
                       END DESC,
                   c."createdAt" DESC
              LIMIT 1
      ) c
      ON true
      WHERE f.cnpj = ${cnpj}
      ORDER BY ct.name
    `;

    if (rows.length === 0) return null;

    const { uf, municipio } = rows[0];

    const checkIntegration = process.env.CHECK_INTEGRATION === "true";

    let estadoExists: { uf: string } | null = null;
    let municipioExists: { uf: string; municipio: string } | null = null;

    if (checkIntegration) {
      estadoExists = await prisma.estadual.findUnique({
        where: { uf },
      });

      municipioExists = await prisma.municipal.findFirst({
        where: {
          uf,
          municipio,
        },
      });
    }

    const cnd = [];

    for (const r of rows) {
      const isExpired =
        !r.file_name || (!!r.validade && new Date(r.validade) < new Date());
      let status = r.status ?? null;

      if (isExpired && status !== "error" && checkIntegration) {
        if (!estadoExists && r.tipo === "estadual") {
          status = "em desenvolvimento";
        }
        if (!municipioExists && r.tipo === "municipal") {
          status = "em desenvolvimento";
        }
        if (r.tipo === "federal") {
          status = "em desenvolvimento";
        }
      }

      if (isExpired) {
        cnd.push({
          tipo: r.tipo,
          file_name: null,
          validade: null,
          emissao: null,
          status,
        });
      } else {
        cnd.push({
          tipo: r.tipo,
          file_name: r.file_name ?? null,
          validade: r.validade ?? null,
          emissao: r.emissao ?? null,
          status,
        });
      }
    }

    return {
      name: rows[0].name,
      cnpj: rows[0].cnpj,
      cnd,
    };
  }
}

export default FornecedorService;

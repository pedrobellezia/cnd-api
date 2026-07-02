import {prisma} from "../lib/prisma.js";
import {type NewCnd, newCnd} from "../schemas/cnd.js";
import {cnd} from "@prisma/client";
import {NotFoundError} from "../lib/error.js";
import processBuffer, {DeepSeekError, savePdf} from "../lib/utils.js";
import { logger } from "../lib/logger.js";

class CndManager {
    static async newCnd(data: NewCnd): Promise<cnd> {
        const cndType = await prisma.cndtype.findUnique({
            where: {id: data.cndtypeid},
            select: {id: true, name: true},
        });

        if (!cndType) {
            throw new NotFoundError(
                `Tipo de CND com id "${data.cndtypeid}" não encontrado`,
            );
        }

        let validade: Date | null = null;
        let emissao: Date | null = null;

        if (data.validade) {
            validade = new Date(data.validade);
            validade.setHours(validade.getHours() + 3);
        }

        if (data.emissao) {
            emissao = new Date(data.emissao);
            emissao.setHours(emissao.getHours() + 3);
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
        });

        logger.info({ context: "CndManager.newCnd", msg: "CND criada com sucesso", fornecedorid: data.fornecedorid, tipo: cndType.name, validade: createdCnd.validade });

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

    static async processFiles(file: Express.Multer.File) {
        try {
            const pdfBuffer = file.buffer;
            const extracted = await processBuffer(pdfBuffer);

            if (!extracted.cnpj) {
                const reason = "CNPJ não encontrado no PDF";
                logger.error({ context: "CndManager.processFiles", msg: "Falha na extração", file: file.originalname, error: reason });
                return {
                    file: file.originalname,
                    success: false,
                    error: reason,
                }
            }

            const fornecedor = await prisma.fornecedor.findUnique({
                where: {cnpj: extracted.cnpj},
            });

            if (!fornecedor) {
                const reason = "O fornecedor associado a esta CND não foi encontrado no banco de dados.";
                logger.error({ context: "CndManager.processFiles", msg: "Fornecedor não encontrado", file: file.originalname, error: reason });
                return {
                    file: file.originalname,
                    success: false,
                    error: reason,
                }
            }

            const fileName = await savePdf(pdfBuffer);

            const cndType = await CndManager.getCndTypeIdByName(extracted.tipo);

            if (!cndType) {
                const reason = `Tipo de CND não suportado ("${extracted.tipo}")`;
                logger.error({ context: "CndManager.processFiles", msg: "Tipo de CND não suportado", file: file.originalname, error: reason });
                return {
                    file: file.originalname,
                    success: false,
                    error: reason,
                }
            }

            const cndData = await newCnd.safeParseAsync({
                fornecedorid: fornecedor.id,
                cndtypeid: cndType.id,
                file_name: fileName,
                validade: extracted.validade ?? undefined,
                emissao: extracted.emissao ?? undefined,
                status: extracted.status,
            });

            if (!cndData.success) {
                logger.error({ context: "CndManager.processFiles", msg: "Falha de validação", file: file.originalname, error: cndData.error.issues });
                return {
                    file: file.originalname,
                    success: false,
                    error: "Ocorreu um erro durante o processamento dos arquivos.",
                }
            }

            const cnd = await CndManager.newCnd(cndData.data);
            return {file: file.originalname, success: true, data: cnd};
        } catch (err: unknown) {
            if (err instanceof DeepSeekError) {
                logger.error({ context: "CndManager.processFiles", msg: "Erro inesperado do deepseek", file: file.originalname, error: err.message });
                return {
                    file: file.originalname,
                    success: false,
                    error: err.message,
                }
            }
            throw err;
        }
    }

    static async getByCnpj(cnpj: string) {
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

        const {uf, municipio} = rows[0];

        const estadoExists = await prisma.estadual.findUnique({
            where: {uf},
        });

        const municipioExists = await prisma.municipal.findFirst({
            where: {
                uf,
                municipio,
            },
        });
        const cnd = []

        

        
        
        for (const r of rows) {
            const isExpired = !r.file_name || new Date(r.validade) < new Date()
            let status = r.status ?? null;

            if (status === "error") {
            } else if (isExpired) {
                if (!estadoExists && r.tipo === "municipal") {
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
            }else{
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
            cnd

        };
    }
}

export default CndManager;


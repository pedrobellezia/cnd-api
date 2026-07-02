import { prisma } from "../lib/prisma.js";
import { fornecedor } from "@prisma/client";
import { ConflictError } from "../lib/error.js";
import { logger } from "../lib/logger.js";

class FornecedorManager {
  static async newFornecedor(
      cnpj: string,
      name: string,
      uf: string,
      municipio: string
  ): Promise<fornecedor> {
    logger.info({ context: "FornecedorManager.newFornecedor", msg: "Criando novo fornecedor", cnpj, name });

    const exist = await prisma.fornecedor.findUnique({where: {cnpj}});

    if (exist) {
      throw new ConflictError(`Fornecedor com CNPJ "${cnpj}" já existe.`);
    }

    const fornecedor = await prisma.fornecedor.create({data: {cnpj, name, uf, municipio}});

    logger.info({ context: "FornecedorManager.newFornecedor", msg: "Fornecedor criado com sucesso", fornecedor });
    return fornecedor;
  }
}
export default FornecedorManager;

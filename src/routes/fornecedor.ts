import { Router } from "express";
import FornecedorManager from "../controllers/fornecedor.js";
import { newFornecedor, searchFornecedorSchema } from "../schemas/fornecedor.js";
import ApiResponseHandler from "../lib/response.js";
import { prisma } from "../lib/prisma.js";

const fornecedorRoute = Router();

fornecedorRoute.post("/", async (req, res) => {
  try {
    const data = await newFornecedor.safeParseAsync(req.body);

    if (!data.success) {
      ApiResponseHandler.validationError(res, data.error);
      return;
    }

    const fornecedor = await FornecedorManager.newFornecedor(
      data.data.cnpj,
      data.data.name,
      data.data.uf,
      data.data.municipio,
    );

    ApiResponseHandler.success(res, fornecedor, 201);
  } catch (error) {
    ApiResponseHandler.trycatchHandler(res, error);
  }
});

fornecedorRoute.get("/", async (req, res) => {
  try {
    const data = await searchFornecedorSchema.safeParseAsync(req.query);
    
    if (!data.success) {
      ApiResponseHandler.validationError(res, data.error);
      return;
    }

    const fornecedores = await prisma.fornecedor.findMany({ where: data.data });

    ApiResponseHandler.success(res, fornecedores);
  } catch (error) {
    ApiResponseHandler.trycatchHandler(res, error);
  }
});

fornecedorRoute.get("/:cnpj", async (req, res) => {
  try {
    const { cnpj } = req.params;

    const fornecedor = await prisma.fornecedor.findUnique({
      where: { cnpj },
      select: {
        cnpj: true,
        name: true,
        cnd: {
          select: {
            cndtype: {
              select: { name: true },
            },
            validade: true,
            status: true,
            emissao: true,
            file_name: true,
          },
        },
      },
    });

    if (!fornecedor) {
      ApiResponseHandler.notFound(res, "Fornecedor");
      return;
    }

    ApiResponseHandler.success(res, fornecedor);
  } catch (error) {
    ApiResponseHandler.trycatchHandler(res, error);
  }
});

export default fornecedorRoute;

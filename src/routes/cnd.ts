import {Router} from "express";
import multer from "multer";
import CndManager from "../controllers/cnd.js";
import ApiResponseHandler from "../lib/response.js";
import { logger } from "../lib/logger.js";

const cndRoute = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB por arquivo
});

cndRoute.post("/", upload.array("file"), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            ApiResponseHandler.error(res, "Arquivo PDF é obrigatório", null, 400);
            return;
        }
        const results = []

        for (const file of req.files) {
            const rs = await CndManager.processFiles(file)
            results.push(rs);

            if (!rs.success) {
                logger.warn({ context: "cndRoute.post", msg: "Falha no arquivo", file: rs.file, error: rs.error });
            }
        }

        ApiResponseHandler.success(res, results, 201);
    } catch (error) {
        logger.error({ context: "cndRoute.post", msg: "Erro geral", error: error instanceof Error ? error.message : error });
        ApiResponseHandler.trycatchHandler(res, error);
    }
});

cndRoute.get("/:cnpj", async (req, res) => {
    try {
        const cnpj = req.params.cnpj;

        if (!cnpj) {
            ApiResponseHandler.error(res, "CNPJ é obrigatório", null, 400);
            return;
        }

        const cnds = await CndManager.getByCnpj(cnpj);

        if (!cnds) {
            ApiResponseHandler.notFound(res, "Fornecedor");
            return;
        }

        ApiResponseHandler.success(res, cnds);
    } catch (error) {
        logger.error({ context: "cndRoute.get", msg: "Erro GET /:cnpj", error: error instanceof Error ? error.message : error });
        ApiResponseHandler.trycatchHandler(res, error);
    }
});

export default cndRoute;
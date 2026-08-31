import {
  deepseekClient,
  cndPromptConfig,
  fornecedorPromptConfig,
} from "../core/deepseek.js";
import { logger } from "../core/logger.js";
import axios from "axios";
import {
  BaseError,
  DeepSeekError,
  DeepSeekErrorType,
} from "../errors/custom-errors.js";

export type CndExtractionResult = {
  cnpj: string;
  emissao: string | null;
  validade: string | null;
  tipo: string;
  status: string;
};

export type FornecedorExtractionResult = {
  cnpj: string;
  name: string;
  uf: string;
  municipio: string;
};

const deepseekMaxTokens = Number(process.env.DEEPSEEK_MAX_TOKENS || 2048);

export class DeepSeekService {
  static async analyzeCndText(text: string): Promise<CndExtractionResult> {
    try {
      const response = await deepseekClient.post("/chat/completions", {
        model: cndPromptConfig.model,
        temperature: cndPromptConfig.temperature,
        response_format: cndPromptConfig.response_format,
        max_tokens: deepseekMaxTokens,
        messages: [
          { role: "system", content: cndPromptConfig.system },
          { role: "user", content: text },
        ],
      });

      const parsed = JSON.parse(response.data.choices[0].message.content);

      if (!parsed.success) {
        throw new DeepSeekError(
          DeepSeekErrorType.ANALYSIS_ERROR,
          parsed.error || "Falha na extração de dados do documento",
        );
      }

      const data = parsed.data;
      return {
        cnpj: data.cnpj,
        emissao: data.emissao,
        validade: data.validade,
        tipo: data.tipo,
        status: data.status,
      };
    } catch (err: unknown) {
      this.handleError(err, "DeepSeekService.analyzeCndText");
    }
  }

  static async analyzeFornecedorText(
    text: string,
  ): Promise<FornecedorExtractionResult> {
    try {
      const response = await deepseekClient.post("/chat/completions", {
        model: fornecedorPromptConfig.model,
        temperature: fornecedorPromptConfig.temperature,
        response_format: fornecedorPromptConfig.response_format,
        max_tokens: deepseekMaxTokens,
        messages: [
          { role: "system", content: fornecedorPromptConfig.system },
          { role: "user", content: text },
        ],
      });

      const parsed = JSON.parse(response.data.choices[0].message.content);

      if (!parsed.success) {
        throw new DeepSeekError(
          DeepSeekErrorType.ANALYSIS_ERROR,
          parsed.error || "Falha na extração de dados do documento",
        );
      }

      const data = parsed.data;
      return {
        cnpj: data.cnpj,
        name: data.name,
        uf: data.uf,
        municipio: data.municipio,
      };
    } catch (err: unknown) {
      this.handleError(err, "DeepSeekService.analyzeFornecedorText");
    }
  }

  private static handleError(err: any, context: string): never {
    if (err instanceof BaseError) {
      throw err;
    }

    if (axios.isAxiosError(err)) {
      logger.error(
        {
          context,
          status: err.response?.status,
          deepseekError: err.response?.data,
          error: err.message,
        },
        `Erro na chamada da API do DeepSeek: ${
          err.response?.data?.error?.message || err.message
        }`,
      );
    } else {
      logger.error(
        {
          context,
          error: err.message || String(err),
          stack: err.stack,
        },
        `Erro inesperado ao processar resposta do DeepSeek: ${err.message || String(err)}`,
      );
    }

    if (axios.isAxiosError(err)) {
      const status = err.response?.status;

      switch (status) {
        case 400:
        case 422:
          throw new DeepSeekError(
            DeepSeekErrorType.CONFIGURATION_ERROR,
            "Erro de configuração nos parâmetros da integração com o DeepSeek.",
          );
        case 401:
          throw new DeepSeekError(
            DeepSeekErrorType.CREDENTIALS_ERROR,
            "Chave de API do DeepSeek inválida.",
          );
        case 402:
          throw new DeepSeekError(
            DeepSeekErrorType.CREDENTIALS_ERROR,
            "Saldo insuficiente na conta do DeepSeek associada à chave de API configurada.",
          );
        case 429:
          throw new DeepSeekError(
            DeepSeekErrorType.RATE_LIMIT_EXCEEDED,
            "Muitas requisições enviadas ao mesmo tempo (Rate Limit).",
          );
        case 503:
          throw new DeepSeekError(
            DeepSeekErrorType.API_COMMUNICATION_ERROR,
            "Os servidores do DeepSeek estão temporariamente sobrecarregados.",
          );

        case 500:
        default:
          throw new DeepSeekError(
            DeepSeekErrorType.API_COMMUNICATION_ERROR,
            "Erro interno nos servidores da API do DeepSeek. Tente novamente mais tarde.",
          );
      }
    }

    if (err instanceof SyntaxError || err instanceof TypeError) {
      throw new DeepSeekError(
        DeepSeekErrorType.INVALID_RESPONSE,
        "Resposta recebida da API do DeepSeek é inválida ou malformada",
        { originalError: err.message },
      );
    }

    throw new DeepSeekError(
      DeepSeekErrorType.API_COMMUNICATION_ERROR,
      err.message || "Erro de comunicação com o serviço do DeepSeek",
    );
  }
}

import * as z from "zod";
import { cnpj } from "cpf-cnpj-validator";

const newFornecedor = z
  .object({
    cnpj: z.string().refine((cnpjT) => cnpj.isValid(cnpjT), {
      message: "CNPJ inválido",
    }),
    name: z.string(),
    uf: z.string().length(2, "UF deve ter exatamente 2 caracteres"),
    municipio: z.string(),
  })
  .strict();

const searchFornecedorSchema = z.object({
  cnpj: z.string().optional(),
  uf: z.string().optional(),
  municipio: z.string().optional(),
});

export { newFornecedor, searchFornecedorSchema };

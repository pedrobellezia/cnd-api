import * as z from "zod";
import { cnpj } from "cpf-cnpj-validator";
import {
  normalizeCnpj,
  normalizeMunicipio,
  normalizeUf,
} from "../utils/normalize.js";

const estadoBrasileiroSchema = z.enum(
  [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ],
  {
    error: "UF inválida",
  },
);

const ufSchema = z.preprocess(normalizeUf, estadoBrasileiroSchema);

export const newFornecedorSchema = z
  .object({
    cnpj: z
      .string()
      .transform(normalizeCnpj)
      .refine((cnpjVal) => cnpj.isValid(cnpjVal), {
        message: "CNPJ inválido",
      }),
    name: z.string().min(1, "Nome é obrigatório"),
    uf: ufSchema,
    municipio: z.preprocess(
      normalizeMunicipio,
      z
        .string({
          error: "Município é obrigatório",
        })
        .min(1, "Município é obrigatório"),
    ),
  })
  .strict();

export const searchFornecedorSchema = z.object({
  cnpj: z
    .string()
    .optional()
    .transform((val) => (val ? normalizeCnpj(val) : undefined)),
  name: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  uf: ufSchema.optional(),
  municipio: z
    .string()
    .optional()
    .transform((val) => (val ? normalizeMunicipio(val) : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type NewFornecedorInput = z.infer<typeof newFornecedorSchema>;
export type SearchFornecedorInput = z.infer<typeof searchFornecedorSchema>;

import * as z from "zod";
import { normalizeCnpj } from "../utils/normalize.js";

export const newCndSchema = z
  .object({
    fornecedorid: z.string(),
    cnpj: z.string(),
    cndtypeid: z.string(),
    file_name: z.string(),
    validade: z.iso.date().optional(),
    emissao: z.iso.date().optional(),
    status: z.enum(["regular", "irregular"]),
  })
  .strict();

export type NewCndInput = z.infer<typeof newCndSchema>;

function toArray(val: unknown): string[] | undefined {
  if (val == null) return undefined;
  const parts = Array.isArray(val) ? val : [val];
  const flat = parts
    .flatMap((v) => String(v).split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  return flat.length > 0 ? flat : undefined;
}

function sortarray(input: unknown) {
  if (typeof input !== "string" || input.trim() === "") return undefined;

  return input.split(",").map((part) => {
    const [key, order] = part.split(":");
    return { key, order };
  });
}

const SortPar = z.object({
    key: z.enum(["createdAt", "validade", "emissao", "status"]),
    order: z.enum(["asc", "desc"]),
});

export const searchCndSchema = z
  .object({
    name: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : undefined)),
    sort: z.preprocess(sortarray, z.array(SortPar).optional()),
    cnpj: z.preprocess(
      toArray,
      z.array(z.string().transform(normalizeCnpj)).optional(),
    ),
    status: z.preprocess(
      toArray,
      z.array(z.string().transform((v) => v.trim().toLowerCase())).optional(),
    ),
    tipo: z.preprocess(
      toArray,
      z.array(z.string().transform((v) => v.trim().toLowerCase())).optional(),
    ),
    emissaoDe: z.iso.date().optional(),
    emissaoAte: z.iso.date().optional(),
    validadeDe: z.iso.date().optional(),
    validadeAte: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type SearchCndInput = z.infer<typeof searchCndSchema>;

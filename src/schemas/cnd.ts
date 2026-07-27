import * as z from "zod";

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

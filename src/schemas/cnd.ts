import * as z from "zod";

const newCnd = z
  .object({
    fornecedorid: z.string(),
    cndtypeid: z.string(),
    file_name: z.string(),
    validade: z.string().optional(),
    emissao: z.string().optional(),
    status: z.enum(["regular", "irregular"]),
  })
  .strict();

export type NewCnd = z.infer<typeof newCnd>;

export { newCnd };

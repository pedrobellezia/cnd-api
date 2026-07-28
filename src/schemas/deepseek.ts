import { z } from "zod";

export const promptConfigSchema = z.object({
  model: z.string().min(1, "O campo 'model' é obrigatório no prompt config"),
  temperature: z.number().min(0).max(2, "A 'temperature' deve ser entre 0 e 2"),
  response_format: z.object({
    type: z.enum(["json_object", "text"]),
  }),
  system: z.string().min(1, "O prompt 'system' não pode estar vazio"),
});

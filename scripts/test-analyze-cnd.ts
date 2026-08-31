import "dotenv/config";
import fs from "fs/promises";
import { PdfService } from "../src/services/pdf.js";
import { DeepSeekService } from "../src/services/deepseek.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Uso: npx tsx scripts/test-analyze-cnd.ts <caminho-do-pdf>");
  process.exit(1);
}

const buffer = await fs.readFile(filePath);
const text = await PdfService.extractTextFromPdf(buffer);

const result = await DeepSeekService.analyzeCndText(text);
console.log(JSON.stringify(result, null, 2));

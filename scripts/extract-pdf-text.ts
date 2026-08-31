import fs from "fs/promises";
import { PdfService } from "../src/services/pdf.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Uso: npx tsx scripts/extract-pdf-text.ts <caminho-do-pdf>");
  process.exit(1);
}

const buffer = await fs.readFile(filePath);
const text = await PdfService.extractTextFromPdf(buffer);

console.log(`--- Texto extraído (${text.length} caracteres) ---`);
console.log(text);

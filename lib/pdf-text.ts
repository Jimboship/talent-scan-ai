import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;

  return text.replace(/\u0000/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

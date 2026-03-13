import { PDFParse } from "pdf-parse";
const MAX_RESUME_TEXT_CHARS = 12_000;

export const extractTextFromPdf = async (buffer: Buffer): Promise<string> => {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const parsed = await parser.getText();
    return preprocessResumeText(parsed.text) ?? "";
  } finally {
    await parser.destroy();
  }
};

export const preprocessResumeText = (text: string): string => {
  return text
    .replace(/[^\x00-\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_RESUME_TEXT_CHARS);
};

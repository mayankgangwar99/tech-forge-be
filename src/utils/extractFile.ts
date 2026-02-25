import fs from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_FILE_SIZE_MB = 15;

export class FileExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileExtractionError";
  }
}

/**
 * Extract from Local File OR URL
 */
export const extractText = async (source: string): Promise<string> => {
  let buffer: Buffer;
  let ext: string;

  if (isValidUrl(source)) {
    ({ buffer, ext } = await fetchFileFromUrl(source));
  } else {
    ({ buffer, ext } = await readLocalFile(source));
  }

  let extractedText = "";

  switch (ext) {
    case ".pdf":
      extractedText = await extractFromPDF(buffer);
      break;
    case ".docx":
      extractedText = await extractFromDocx(buffer);
      break;
    case ".txt":
      extractedText = buffer.toString("utf-8");
      break;
    default:
      throw new FileExtractionError("Unsupported file type");
  }

  return normalizeText(extractedText);
};

/**
 * Fetch file from URL
 */
async function fetchFileFromUrl(url: string): Promise<{
  buffer: Buffer;
  ext: string;
}> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new FileExtractionError(
      `Failed to download file: ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileSizeMB = buffer.length / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new FileExtractionError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit`);
  }

  const ext = getExtensionFromUrl(url);

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new FileExtractionError("Unsupported file type from URL");
  }

  return { buffer, ext };
}

/**
 * Read local file
 */
async function readLocalFile(filePath: string): Promise<{
  buffer: Buffer;
  ext: string;
}> {
  const absolutePath = path.resolve(filePath);

  await fs.access(absolutePath);

  const stats = await fs.stat(absolutePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new FileExtractionError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit`);
  }

  const ext = path.extname(absolutePath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new FileExtractionError("Unsupported file type");
  }

  const buffer = await fs.readFile(absolutePath);

  return { buffer, ext };
}

/**
 * PDF Extraction (Modern)
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const parsed = await parser.getText();
    return parsed.text ?? "";
  } finally {
    await parser.destroy();
  }
}

/**
 * DOCX Extraction
 */
async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Helpers
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/(\d)\s*\+\s*Years?/gi, "$1+ Years")
    .replace(/(\d)\s+Years?/gi, "$1+ Years")
    .trim();
}

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function getExtensionFromUrl(url: string): string {
  return path.extname(new URL(url).pathname).toLowerCase();
}

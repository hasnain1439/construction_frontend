import type { AttachmentKind } from "@/api/types";

/**
 * Photos picked on the website are shrunk in the browser before upload, like the mobile app does
 * (a phone photo is 3–5 MB as-is; resized it is ~150–400 KB). PDFs and audio are left alone.
 *
 * - Site photos: long side 1280 px (same as the app).
 * - Bills, challans, receipts, slips, documents: 2000 px and higher quality, so the text stays readable.
 * - Logo and profile photo: 600 px.
 * JPEG stays JPEG; PNG / WEBP become WEBP (keeps transparency, e.g. logos).
 * The original is kept whenever shrinking fails or would not make the file smaller.
 */

const SHRINKABLE = ["image/jpeg", "image/png", "image/webp"];

interface Rule {
  maxSide: number;
  quality: number;
}

const PAPER: Rule = { maxSide: 2000, quality: 0.8 };
const PHOTO: Rule = { maxSide: 1280, quality: 0.7 };
const SMALL: Rule = { maxSide: 600, quality: 0.85 };

export function shrinkRule(kind: AttachmentKind): Rule | null {
  switch (kind) {
    case "SITE_PHOTO":
      return PHOTO;
    case "LOGO":
    case "PROFILE_PHOTO":
      return SMALL;
    case "RECEIPT":
    case "DOCUMENT":
    case "PAYMENT_SLIP":
    case "CHALLAN":
      return PAPER;
    default:
      return null;
  }
}

export function isShrinkable(file: Pick<File, "type">, kind: AttachmentKind): boolean {
  return SHRINKABLE.includes(file.type) && shrinkRule(kind) !== null;
}

/** New size with the long side at most `maxSide`; never upscales. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= maxSide) return { width, height };
  const scale = maxSide / longSide;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function renamed(name: string, mime: string): string {
  const ext = mime === "image/jpeg" ? "jpg" : "webp";
  const base = name.replace(/\.[^./\\]+$/, "") || "photo";
  return `${base}.${ext}`;
}

export async function shrinkImage(file: File, kind: AttachmentKind): Promise<File> {
  const rule = shrinkRule(kind);
  if (!rule || !SHRINKABLE.includes(file.type)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    // "from-image" applies the camera's EXIF rotation, so the photo is not saved sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const size = fitWithin(bitmap.width, bitmap.height, rule.maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, rule.quality));
    // Some browsers fall back to PNG when they cannot write WEBP: keep the original then.
    if (!blob || blob.type !== mime || blob.size >= file.size) return file;
    return new File([blob], renamed(file.name, mime), { type: mime, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

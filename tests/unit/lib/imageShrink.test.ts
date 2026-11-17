import { afterEach, describe, expect, it, vi } from "vitest";
import { fitWithin, isShrinkable, shrinkImage, shrinkRule } from "@/lib/imageShrink";

const photo = (bytes: number, type = "image/jpeg", name = "IMG_1234.JPG") => new File([new Uint8Array(bytes)], name, { type });

/** Fake browser image pipeline: a bitmap of the given size, a canvas whose toBlob returns `outBytes`. */
function fakeBrowser(width: number, height: number, outBytes: number, outType?: string) {
  const drawn: number[][] = [];
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width, height, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: (_b: unknown, _x: number, _y: number, w: number, h: number) => drawn.push([w, h]),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (cb, type) {
    cb(new Blob([new Uint8Array(outBytes)], { type: outType ?? type }));
  });
  return drawn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("image shrinking before upload", () => {
  it("fits the long side and never upscales", () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it("uses a size per kind and leaves PDFs, audio and generated files alone", () => {
    expect(shrinkRule("SITE_PHOTO")?.maxSide).toBe(1280);
    expect(shrinkRule("CHALLAN")?.maxSide).toBe(2000);
    expect(shrinkRule("LOGO")?.maxSide).toBe(600);
    expect(shrinkRule("VOICE_NOTE")).toBeNull();
    expect(shrinkRule("INVOICE_PDF")).toBeNull();
    expect(isShrinkable({ type: "application/pdf" }, "CHALLAN")).toBe(false);
    expect(isShrinkable({ type: "image/png" }, "RECEIPT")).toBe(true);
  });

  it("a big phone photo becomes a small JPEG at 1280 px", async () => {
    const drawn = fakeBrowser(4032, 3024, 300_000);
    const out = await shrinkImage(photo(4_500_000), "SITE_PHOTO");
    expect(drawn).toEqual([[1280, 960]]);
    expect(out.type).toBe("image/jpeg");
    expect(out.size).toBe(300_000);
    expect(out.name).toBe("IMG_1234.jpg");
  });

  it("a PNG logo becomes WEBP (keeps transparency)", async () => {
    fakeBrowser(2000, 1000, 40_000);
    const out = await shrinkImage(photo(900_000, "image/png", "logo.png"), "LOGO");
    expect(out.type).toBe("image/webp");
    expect(out.name).toBe("logo.webp");
  });

  it("keeps the original when the result is not smaller, the browser cannot write WEBP, or it is a PDF", async () => {
    fakeBrowser(800, 600, 200_000);
    const small = photo(100_000);
    expect(await shrinkImage(small, "SITE_PHOTO")).toBe(small);

    vi.restoreAllMocks();
    fakeBrowser(3000, 2000, 50_000, "image/png");
    const png = photo(2_000_000, "image/png", "slip.png");
    expect(await shrinkImage(png, "PAYMENT_SLIP")).toBe(png);

    const pdf = photo(2_000_000, "application/pdf", "bill.pdf");
    expect(await shrinkImage(pdf, "CHALLAN")).toBe(pdf);
  });

  it("keeps the original when the browser has no image support", async () => {
    const original = photo(3_000_000);
    expect(await shrinkImage(original, "SITE_PHOTO")).toBe(original);
  });
});

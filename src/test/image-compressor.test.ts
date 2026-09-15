import { describe, expect, it } from "vitest";
import { compressItemImage, compressMultipleImages } from "@/lib/image-compressor";

describe("Image Compressor Pipeline", () => {
  it("bypasses non-image files unchanged", async () => {
    const pdfFile = new File(["dummy-pdf-content"], "document.pdf", { type: "application/pdf" });
    const result = await compressItemImage(pdfFile);
    expect(result).toBe(pdfFile);
  });

  it("bypasses SVG files unchanged", async () => {
    const svgFile = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    const result = await compressItemImage(svgFile);
    expect(result).toBe(svgFile);
  });

  it("bypasses lightweight WebP images under 120KB unchanged", async () => {
    const smallWebpFile = new File([new Uint8Array(50 * 1024)], "tiny.webp", {
      type: "image/webp",
    });
    const result = await compressItemImage(smallWebpFile);
    expect(result).toBe(smallWebpFile);
  });

  it("bypasses lightweight JPEG images under 120KB unchanged", async () => {
    const smallJpegFile = new File([new Uint8Array(80 * 1024)], "thumb.jpg", {
      type: "image/jpeg",
    });
    const result = await compressItemImage(smallJpegFile);
    expect(result).toBe(smallJpegFile);
  });

  it("processes multiple images in parallel", async () => {
    const file1 = new File(["dummy1"], "one.pdf", { type: "application/pdf" });
    const file2 = new File(["dummy2"], "two.svg", { type: "image/svg+xml" });

    const results = await compressMultipleImages([file1, file2]);
    expect(results).toHaveLength(2);
    expect(results[0]).toBe(file1);
    expect(results[1]).toBe(file2);
  });
});

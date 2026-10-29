import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeystoneLogo, KeystoneMark } from "@/components/brand/Keystone";

const BRAND = join(__dirname, "..", "..", "..", "src", "assets", "brand");
const SOURCE = readFileSync(
  join(__dirname, "..", "..", "..", "src", "components", "brand", "Keystone.tsx"),
  "utf8",
);

/** Every path `d`, rect and viewBox of a master SVG. */
function shapes(file: string) {
  const svg = readFileSync(join(BRAND, file), "utf8");
  return [
    ...[...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]!),
    ...[...svg.matchAll(/viewBox="([^"]+)"/g)].map((m) => m[1]!),
    ...[...svg.matchAll(/fill="(#[0-9A-F]{6})"/gi)].map((m) => m[1]!),
  ];
}

describe("Keystone brand", () => {
  it.each(["keystone-mark.svg", "keystone-mark-dark.svg", "keystone-mark-small.svg"])(
    "inlines the master %s unchanged",
    (file) => {
      for (const shape of shapes(file)) expect(SOURCE).toContain(shape);
    },
  );

  it("uses the small mark (no base bar) at 32 px and the full mark above", () => {
    const { container, rerender } = render(<KeystoneMark size={32} />);
    expect(container.querySelector("svg.dark\\:hidden")?.getAttribute("viewBox")).toBe("8 2 48 56");
    rerender(<KeystoneMark size={48} />);
    expect(container.querySelector("svg.dark\\:hidden")?.getAttribute("viewBox")).toBe("0 0 64 64");
    // Dark mode swaps in the dark variant (sand arch).
    expect(container.querySelector("svg.dark\\:block path")?.getAttribute("fill")).toBe("#B5A18B");
  });

  it("keeps the wordmark Latin and left-to-right", () => {
    render(
      <div dir="rtl">
        <KeystoneLogo />
      </div>,
    );
    const word = screen.getByText("Keystone");
    expect(word.getAttribute("dir")).toBe("ltr");
    expect(word.closest("[data-brand-logo]")?.getAttribute("dir")).toBe("ltr");
  });
});

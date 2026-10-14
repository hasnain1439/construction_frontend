/**
 * No hard-coded user-facing text in the company app (src/features, src/components, src/app — the
 * platform admin console may stay English): words shown to the user must come from the dictionaries.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { companyAppFiles, ROOT, scan } from "./literalScanner";

describe("no hard-coded user-facing text", () => {
  const all = companyAppFiles();

  it("scans the pages and components", () => {
    expect(all.length).toBeGreaterThan(200);
    expect(all.some((f) => f.replace(/\\/g, "/").includes("/features/admin/"))).toBe(false);
  });

  it("every visible word in the company app comes from the dictionaries", { timeout: 60_000 }, () => {
    expect(all.flatMap((file) => scan(file))).toEqual([]);
  });

  it("the scanner catches literal text (self-check)", () => {
    const probe = [
      'export const metadata = { title: "Tab title" };',
      "export const A = () => (<>",
      '<p>Save now</p><p>{ok ? "Yes" : t("x")}</p>',
      '<B label="Back" title={`OT ${h} hours`} placeholder="0" aria-label={t("common.close")} />',
      '<p>{n} · {"Rs"}</p><C header="Amount" description={"common.save"} />',
      "</>);",
      'const cols = [{ header: "Supplier" }];',
      'toast.success("Hazri saved");',
      'const s = z.string().min(3, "Too short");',
      'const r = requiredText("Scope of work", 2);',
      'const k = requiredText("field.amount");',
    ].join("\n");
    expect(scan(join(ROOT, "probe.tsx"), probe).map((s) => s.replace(/^.*?:\d+ /, ""))).toEqual([
      '"Save now"',
      '"Yes"',
      '"Back"',
      '"hours"',
      '"Amount"',
      '"Supplier"',
      '"Hazri saved"',
      '"Too short"',
      '"Scope of work"',
    ]);
  });
});

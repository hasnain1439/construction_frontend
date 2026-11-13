import { describe, expect, it } from "vitest";
import { COMPANY_NAV, PROJECT_NAV } from "@/lib/navigation";
import { NAV_ITEM_ICONS } from "@/lib/navIcons";

describe("sub-menu icons", () => {
  it("every company and project sub-menu item has an icon of its own", () => {
    const missing = [...COMPANY_NAV, ...PROJECT_NAV].flatMap((s) => s.items).filter((i) => !NAV_ITEM_ICONS[i.id]).map((i) => i.id);
    expect(missing).toEqual([]);
  });
});

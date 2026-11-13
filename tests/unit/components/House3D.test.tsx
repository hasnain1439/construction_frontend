import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { House3DCanvas } from "@/components/house3d/House3DCanvas";
import { buildHouse } from "@/lib/house3d/layout";

describe("house 3D canvas", () => {
  it("a browser without WebGL is told so instead of a broken page", () => {
    const model = buildHouse({ frontFt: 30, depthFt: 60, structureType: "FRAMED", foundation: null, coverage: null, floors: [] });
    const unsupported = vi.fn();
    const { container } = render(
      <House3DCanvas model={model} options={{ show: "all", upTo: 0, foundation: false, roofs: true, walls: true, boundary: true, labels: true }} view="corner" viewKey={0} onUnsupported={unsupported} />,
    );
    expect(unsupported).toHaveBeenCalledTimes(1);
    expect(container.querySelector("canvas")).toBeNull();
  });
});

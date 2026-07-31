import { describe, expect, it } from "vitest";
import { optionsFallback } from "./optionsFallback";

describe("optionsFallback", () => {
  it("fills defaults for an empty options object", () => {
    const options = optionsFallback({});

    expect(options.size).toBe(128);
    expect(options.placement).toBe("top-right");
    expect(options.animated).toBe(true);
    expect(options.buttons).toEqual({ roll: true, home: true });
    expect(options.homeView).toBeNull();
    expect(options.poleUp).toEqual({ top: [0, 0, -1], bottom: [0, 0, 1] });
    expect(options.x.label).toBe("Right");
    expect(options.y.label).toBe("Top");
    expect(options.z.label).toBe("Front");
    expect(options.nx.label).toBe("Left");
    expect(options.ny.label).toBe("Bottom");
    expect(options.nz.label).toBe("Back");
  });

  it("resolves CAD face aliases onto axis keys", () => {
    const options = optionsFallback({
      front: { label: "F" },
      top: { label: "T" },
      left: { label: "L" },
    });

    expect(options.z.label).toBe("F");
    expect(options.y.label).toBe("T");
    expect(options.nx.label).toBe("L");
  });

  it("keeps a configured poleUp and homeView", () => {
    const options = optionsFallback({
      poleUp: { top: [1, 0, 0], bottom: [-1, 0, 0] },
      homeView: { direction: [0, 1, 0] },
    });

    expect(options.poleUp).toEqual({ top: [1, 0, 0], bottom: [-1, 0, 0] });
    expect(options.homeView).toEqual({ direction: [0, 1, 0] });
  });

  it("fills a partial poleUp from the defaults", () => {
    const options = optionsFallback({ poleUp: { top: [1, 0, 0] } });

    expect(options.poleUp.top).toEqual([1, 0, 0]);
    expect(options.poleUp.bottom).toEqual([0, 0, 1]);
  });

  it("lets negative axes inherit from their positive counterpart", () => {
    const options = optionsFallback({ x: { color: 0x123456 } });

    expect(options.nx.color).toBe(0x123456);
    expect(options.nx.label).toBe("Left");
  });

  it("does not mutate the caller's options object", () => {
    const input = { x: { label: "custom" } };
    optionsFallback(input);
    expect(input).toEqual({ x: { label: "custom" } });
  });
});

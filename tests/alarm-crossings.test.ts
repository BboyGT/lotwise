import { describe, expect, it } from "vitest";
import { didCrossPriceLevel } from "@/hooks/use-alarm-manager";

describe("price level crossings", () => {
  it("detects directional crossings without triggering while price is already beyond the level", () => {
    expect(didCrossPriceLevel(99, 101, 100, "above")).toBe(true);
    expect(didCrossPriceLevel(101, 102, 100, "above")).toBe(false);
    expect(didCrossPriceLevel(101, 99, 100, "below")).toBe(true);
    expect(didCrossPriceLevel(99, 98, 100, "below")).toBe(false);
  });

  it("waits for a previous live price and rejects invalid values", () => {
    expect(didCrossPriceLevel(undefined, 101, 100, "above")).toBe(false);
    expect(didCrossPriceLevel(99, Number.NaN, 100, "above")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  isAllowedPushEndpoint,
  isDeviceToken,
  marketKey,
  validLevel,
  type BackgroundLevel,
} from "../netlify/functions/_shared/push";

const baseAlert: BackgroundLevel = {
  id: "alert-1",
  symbolId: "VOL75",
  symbolLabel: "Volatility 75 Index",
  price: 42_000,
  direction: "above",
  derivSymbol: "R_75",
};

describe("background push validation", () => {
  it("accepts only 256-bit hex device tokens", () => {
    expect(isDeviceToken("a".repeat(64))).toBe(true);
    expect(isDeviceToken("a".repeat(63))).toBe(false);
    expect(isDeviceToken("g".repeat(64))).toBe(false);
  });

  it("accepts known browser push services and rejects insecure or local endpoints", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/example")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/example")).toBe(true);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/example")).toBe(false);
    expect(isAllowedPushEndpoint("https://127.0.0.1/admin")).toBe(false);
    expect(isAllowedPushEndpoint("https://attacker.example/push")).toBe(false);
  });

  it("requires a supported feed and a valid target for an alert", () => {
    expect(validLevel(baseAlert, "alert")).toBe(true);
    expect(validLevel({ ...baseAlert, price: 0 }, "alert")).toBe(false);
    expect(validLevel({ ...baseAlert, direction: "sideways" }, "alert")).toBe(false);
    expect(validLevel({ ...baseAlert, derivSymbol: undefined }, "alert")).toBe(false);
  });

  it("uses the provider and symbol as the shared price key", () => {
    expect(marketKey(baseAlert)).toBe("deriv:R_75");
    expect(marketKey({ binanceSymbol: "BTCUSDT" })).toBe("binance:BTCUSDT");
    expect(marketKey({ tvScannerSymbol: "FX:EURUSD" })).toBe("tv:FX:EURUSD");
  });
});

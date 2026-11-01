import { describe, expect, it } from "vitest";
import { getSymbol, SYMBOLS } from "../src/lib/symbols-v3";

describe("live market catalog identifiers", () => {
  it("uses the Dow Jones index for US30 charts and live quotes", () => {
    expect(getSymbol("US30").tvSymbol).toBe("DJ:DJI");
    expect(getSymbol("US30").tvScannerSymbol).toBe("DJ:DJI");
  });

  it("uses the verified TradingView IDs for previously failing indices", () => {
    expect(getSymbol("ITA40").tvScannerSymbol).toBe("FTSE:FTSEMIB");
    expect(getSymbol("AUS200").tvScannerSymbol).toBe("SP:XJO");
    expect(getSymbol("KOSPI200").tvScannerSymbol).toBe("KRX:KOSPI200");
  });

  it("uses active Binance pairs for renamed assets and preserves retired Maker history", () => {
    expect(getSymbol("RNDRUSD").binanceSymbol).toBe("RENDERUSDT");
    expect(getSymbol("FTMUSD").binanceSymbol).toBe("SUSDT");
    expect(getSymbol("SKYUSD").binanceSymbol).toBe("SKYUSDT");
    expect(getSymbol("MKRUSD").binanceSymbol).toBeUndefined();
  });
});

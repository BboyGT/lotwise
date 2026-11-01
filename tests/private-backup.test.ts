import { describe, expect, it } from "vitest";
import {
  createVaultRecoveryKey,
  decryptFileBackup,
  decryptVaultBackup,
  encryptFileBackup,
  encryptVaultBackup,
  type LotwiseBackup,
} from "@/lib/private-backup";

const backup: LotwiseBackup = {
  format: "lotwise-private-backup",
  version: 1,
  createdAt: "2026-11-01T00:00:00.000Z",
  journal: [],
  alerts: [],
  alarmSettings: { enabled: true, notifyEntry: true, notifySL: true, notifyTP: true, volume: 0.6, browserNotifications: true },
  settings: { displayCurrency: "USD", balance: 1000, riskPercent: 2 },
  accounts: [
    { id: "main", name: "Main account", balance: 1000, startingBalance: 1000 },
    { id: "small", name: "Small account", balance: 20, startingBalance: 20 },
  ],
  activeAccountId: "small",
};

describe("encrypted private backups", () => {
  it("encrypts and restores a password-protected file", async () => {
    const encrypted = await encryptFileBackup(backup, "a strong test passphrase");
    expect(await encrypted.text()).not.toContain("1000");
    const file = new File([encrypted], "backup.lotwise", { type: "application/json" });
    await expect(decryptFileBackup(file, "a strong test passphrase")).resolves.toMatchObject({
      settings: backup.settings,
      accounts: backup.accounts,
      activeAccountId: backup.activeAccountId,
    });
    await expect(decryptFileBackup(file, "incorrect passphrase")).rejects.toThrow("Could not decrypt");
  });

  it("encrypts and restores a vault snapshot with its recovery key", async () => {
    const key = createVaultRecoveryKey();
    const envelope = await encryptVaultBackup(backup, key);
    expect(JSON.stringify(envelope)).not.toContain("1000");
    await expect(decryptVaultBackup(envelope, key)).resolves.toMatchObject({
      settings: backup.settings,
      accounts: backup.accounts,
      activeAccountId: backup.activeAccountId,
    });
    await expect(decryptVaultBackup(envelope, createVaultRecoveryKey())).rejects.toThrow("Could not decrypt");
  });
});

import type { AlarmSettings, PriceAlert } from "@/hooks/use-alarm-manager";

export interface BackupSettings {
  displayCurrency: string;
  balance: number;
  riskPercent: number;
}

export interface LotwiseBackup {
  format: "lotwise-private-backup";
  version: 1;
  createdAt: string;
  journal: unknown[];
  alerts: PriceAlert[];
  alarmSettings: AlarmSettings;
  settings: BackupSettings;
}

interface EncryptedEnvelope {
  format: "lotwise-encrypted";
  version: 1;
  purpose: "file" | "vault";
  salt?: string;
  iv: string;
  ciphertext: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_BACKUP_BYTES = 2_000_000;
const PBKDF2_ITERATIONS = 310_000;

function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("The encrypted backup is malformed.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function passphraseKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: asBufferSource(salt), iterations: PBKDF2_ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFileBackup(data: LotwiseBackup, passphrase: string): Promise<Blob> {
  if (passphrase.length < 12) throw new Error("Use a backup passphrase with at least 12 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passphraseKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(data)));
  const envelope: EncryptedEnvelope = {
    format: "lotwise-encrypted", version: 1, purpose: "file",
    salt: base64Url(salt), iv: base64Url(iv), ciphertext: base64Url(new Uint8Array(ciphertext)),
  };
  return new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
}

export async function decryptFileBackup(file: File, passphrase: string): Promise<LotwiseBackup> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("That backup file is larger than 2 MB.");
  const envelope = JSON.parse(await file.text()) as EncryptedEnvelope;
  if (envelope.format !== "lotwise-encrypted" || envelope.version !== 1 || envelope.purpose !== "file" || !envelope.salt) {
    throw new Error("This is not a supported Lotwise encrypted backup.");
  }
  const salt = fromBase64Url(envelope.salt);
  const iv = fromBase64Url(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error("The encrypted backup is malformed.");
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBufferSource(iv) }, await passphraseKey(passphrase, salt), asBufferSource(fromBase64Url(envelope.ciphertext)));
  } catch {
    throw new Error("Could not decrypt the backup. Check the passphrase and try again.");
  }
  return validateBackup(JSON.parse(decoder.decode(plaintext)));
}

function validateBackup(value: unknown): LotwiseBackup {
  if (!value || typeof value !== "object") throw new Error("The backup contents are invalid.");
  const data = value as Partial<LotwiseBackup>;
  if (data.format !== "lotwise-private-backup" || data.version !== 1 || !Array.isArray(data.journal) ||
      !Array.isArray(data.alerts) || !data.alarmSettings || !data.settings ||
      typeof data.settings.balance !== "number" || typeof data.settings.riskPercent !== "number" ||
      typeof data.settings.displayCurrency !== "string" ||
      !data.journal.every(isTradeRecord) || !data.alerts.every(isPriceAlert) ||
      typeof data.alarmSettings.enabled !== "boolean" || typeof data.alarmSettings.notifyEntry !== "boolean" ||
      typeof data.alarmSettings.notifySL !== "boolean" || typeof data.alarmSettings.notifyTP !== "boolean" ||
      typeof data.alarmSettings.browserNotifications !== "boolean" || !Number.isFinite(data.alarmSettings.volume) ||
      data.alarmSettings.volume < 0 || data.alarmSettings.volume > 1 ||
      !Number.isFinite(data.settings.balance) || data.settings.balance < 0 ||
      !Number.isFinite(data.settings.riskPercent) || data.settings.riskPercent < 0 || data.settings.riskPercent > 100) {
    throw new Error("The backup contents are incomplete or unsupported.");
  }
  if (data.journal.length > 500 || data.alerts.length > 500) throw new Error("The backup contains too many records.");
  return data as LotwiseBackup;
}

function isPriceAlert(value: unknown): value is PriceAlert {
  if (!value || typeof value !== "object") return false;
  const alert = value as Record<string, unknown>;
  return typeof alert.id === "string" && typeof alert.symbolId === "string" &&
    typeof alert.symbolLabel === "string" && typeof alert.assetClass === "string" &&
    typeof alert.price === "number" && Number.isFinite(alert.price) && alert.price > 0 &&
    (alert.direction === "above" || alert.direction === "below") &&
    Number.isFinite(alert.createdAt) &&
    (alert.status === "active" || alert.status === "triggered" || alert.status === "dismissed") &&
    typeof alert.type === "string";
}

function isTradeRecord(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const trade = value as Record<string, unknown>;
  const numbers = ["timestamp", "balance", "riskPercent", "entry", "stopLoss", "takeProfit", "recommendedLot", "actualLoss", "actualProfit", "rrRatio"];
  return typeof trade.id === "string" && typeof trade.symbolId === "string" &&
    typeof trade.symbolLabel === "string" && typeof trade.assetClass === "string" &&
    numbers.every((key) => typeof trade[key] === "number" && Number.isFinite(trade[key])) &&
    (trade.outcome === undefined || trade.outcome === "win" || trade.outcome === "loss" || trade.outcome === "breakeven" || trade.outcome === "pending") &&
    (trade.note === undefined || typeof trade.note === "string") &&
    (trade.realizedPnL === undefined || (typeof trade.realizedPnL === "number" && Number.isFinite(trade.realizedPnL)));
}

export function createVaultRecoveryKey(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(64)));
}

async function vaultMaterial(recoveryKey: string) {
  const raw = fromBase64Url(recoveryKey.trim());
  if (raw.length !== 64) throw new Error("Enter a valid Lotwise recovery key.");
  const encryptionKey = await crypto.subtle.importKey("raw", raw.slice(0, 32), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  // The second half is only a vault locator/access credential; it cannot decrypt vault contents.
  return { encryptionKey, accessKey: base64Url(raw.slice(32)) };
}

export async function encryptVaultBackup(data: LotwiseBackup, recoveryKey: string): Promise<EncryptedEnvelope> {
  const { encryptionKey } = await vaultMaterial(recoveryKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBufferSource(iv) }, encryptionKey, encoder.encode(JSON.stringify(data)));
  return { format: "lotwise-encrypted", version: 1, purpose: "vault", iv: base64Url(iv), ciphertext: base64Url(new Uint8Array(ciphertext)) };
}

export async function decryptVaultBackup(envelope: unknown, recoveryKey: string): Promise<LotwiseBackup> {
  const { encryptionKey } = await vaultMaterial(recoveryKey);
  const value = envelope as Partial<EncryptedEnvelope>;
  if (!value || value.format !== "lotwise-encrypted" || value.version !== 1 || value.purpose !== "vault") {
    throw new Error("No supported encrypted backup was found in this vault.");
  }
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBufferSource(fromBase64Url(value.iv ?? "")) }, encryptionKey, asBufferSource(fromBase64Url(value.ciphertext ?? "")));
    return validateBackup(JSON.parse(decoder.decode(plaintext)));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The backup")) throw error;
    throw new Error("Could not decrypt this vault. Check the recovery key and try again.");
  }
}

export async function callVault(action: "save" | "load" | "delete", recoveryKey: string, envelope?: EncryptedEnvelope): Promise<unknown> {
  const { accessKey } = await vaultMaterial(recoveryKey);
  const response = await fetch("/api/sync-vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, accessKey, ...(envelope ? { envelope } : {}) }),
  });
  const result = await response.json() as { error?: string; envelope?: unknown };
  if (!response.ok) throw new Error(result.error || `Vault request failed (${response.status}).`);
  return result.envelope;
}

export function validateBackupData(value: unknown): LotwiseBackup {
  return validateBackup(value);
}

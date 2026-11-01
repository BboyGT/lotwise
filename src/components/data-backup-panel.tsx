"use client";

import { useRef, useState } from "react";
import { Check, Copy, Download, KeyRound, LockKeyhole, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  callVault, createVaultRecoveryKey, decryptFileBackup, decryptVaultBackup,
  encryptFileBackup, encryptVaultBackup, type LotwiseBackup,
} from "@/lib/private-backup";

export function DataBackupPanel({ snapshot, onRestore }: { snapshot: LotwiseBackup; onRestore: (data: LotwiseBackup) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filePassword, setFilePassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true); setStatus("");
    try { await task(); } catch (error) { setStatus(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  function restore(data: LotwiseBackup) {
    if (!window.confirm(`Restore ${data.journal.length} journal entries and ${data.alerts.length} alerts? This replaces data on this device.`)) return;
    onRestore(data);
    setStatus("Your journal, alerts, and settings were restored on this device.");
  }

  async function exportFile() {
    const blob = await encryptFileBackup(snapshot, filePassword);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `lotwise-backup-${new Date().toISOString().slice(0, 10)}.lotwise`;
    link.click(); URL.revokeObjectURL(url);
    setStatus("Encrypted backup downloaded. Keep the passphrase separate from the file.");
  }

  async function importFile(file?: File) {
    if (!file) return;
    const data = await decryptFileBackup(file, filePassword);
    restore(data);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveVault() {
    if (!recoveryKey) throw new Error("Create or enter a recovery key first.");
    const envelope = await encryptVaultBackup(snapshot, recoveryKey);
    await callVault("save", recoveryKey, envelope);
    setStatus("Encrypted data uploaded. Your recovery key is required to restore it.");
  }

  async function loadVault() {
    if (!recoveryKey) throw new Error("Enter your recovery key first.");
    const envelope = await callVault("load", recoveryKey);
    const data = await decryptVaultBackup(envelope, recoveryKey);
    restore(data);
  }

  async function deleteVault() {
    if (!recoveryKey) throw new Error("Enter your recovery key first.");
    if (!window.confirm("Permanently delete the encrypted snapshot stored in this vault? This cannot be undone.")) return;
    await callVault("delete", recoveryKey);
    setStatus("The encrypted snapshot was deleted from the vault.");
  }

  async function copyKey() {
    await navigator.clipboard.writeText(recoveryKey);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="p-4 space-y-6 max-h-[65vh] overflow-y-auto text-slate-300">
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-amber-300"><LockKeyhole className="h-4 w-4" /><h3 className="text-xs font-mono uppercase tracking-wider">Encrypted file backup</h3></div>
        <p className="text-xs text-slate-400">Download a password-protected file to move your journal, alerts, and preferences between devices. Lotwise cannot recover a forgotten passphrase.</p>
        <Label htmlFor="backup-passphrase" className="text-[10px] uppercase text-slate-500">Backup passphrase (12+ characters)</Label>
        <Input id="backup-passphrase" type="password" autoComplete="new-password" value={filePassword} onChange={(e) => setFilePassword(e.target.value)} placeholder="Choose a strong passphrase" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || filePassword.length < 12} onClick={() => void run(exportFile)}><Download className="h-3.5 w-3.5" />Export encrypted file</Button>
          <Button size="sm" variant="outline" disabled={busy || filePassword.length < 12} onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5" />Import encrypted file</Button>
          <input ref={fileRef} type="file" accept=".lotwise,application/json" className="hidden" onChange={(e) => void run(() => importFile(e.target.files?.[0]))} />
        </div>
      </section>

      <section className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-cyan-300"><KeyRound className="h-4 w-4" /><h3 className="text-xs font-mono uppercase tracking-wider">Optional encrypted sync vault</h3></div>
        <p className="text-xs text-slate-400">Create a recovery key and keep it somewhere safe. Only ciphertext is stored by Netlify. Use Save on one device and Restore on another; saving replaces the vault’s previous snapshot.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { setRecoveryKey(createVaultRecoveryKey()); setStatus("New recovery key generated. Copy it and keep a safe backup before using the vault."); }}><KeyRound className="h-3.5 w-3.5" />Generate recovery key</Button>
          {recoveryKey && <Button size="sm" variant="ghost" onClick={() => void run(copyKey)}><Copy className="h-3.5 w-3.5" />{copied ? <Check className="h-3.5 w-3.5" /> : "Copy key"}</Button>}
        </div>
        <Label htmlFor="vault-key" className="text-[10px] uppercase text-slate-500">Private recovery key</Label>
        <Input id="vault-key" autoComplete="off" spellCheck={false} value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} placeholder="Paste the recovery key from another device" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || !recoveryKey} onClick={() => void run(saveVault)}><Upload className="h-3.5 w-3.5" />Save encrypted snapshot</Button>
          <Button size="sm" variant="outline" disabled={busy || !recoveryKey} onClick={() => void run(loadVault)}><Download className="h-3.5 w-3.5" />Restore from vault</Button>
          <Button size="sm" variant="ghost" disabled={busy || !recoveryKey} onClick={() => void run(deleteVault)} className="text-rose-300">Delete vault snapshot</Button>
        </div>
      </section>
      {status && <p role="status" className="rounded border border-white/10 bg-black/30 p-2 text-xs text-slate-300 break-words">{status}</p>}
      <p className="text-[10px] text-slate-500">The file passphrase encrypts backups with AES-GCM. The vault recovery key contains separate encryption and storage-access keys; the encryption key never leaves this browser.</p>
    </div>
  );
}

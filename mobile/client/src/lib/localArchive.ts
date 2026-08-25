/** Lokaler Signlocal-Tresor: AES-GCM-verschlüsselte PDFs und WebAuthn-Gerätebestätigung ohne Dokumentserver. */
export type LocalSignedDocument = {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  pdf: Blob;
};

type EncryptedSignedDocument = Omit<LocalSignedDocument, "pdf"> & {
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
};

export type VaultSettings = {
  id: "vault-settings";
  version: 1;
  salt: ArrayBuffer;
  verifier: ArrayBuffer;
  verifierIv: ArrayBuffer;
  faceIdCredentialId?: ArrayBuffer;
};

export type VaultRotationProgress = {
  stage: "preparing" | "processing" | "saving" | "complete";
  completed: number;
  total: number;
};

export type EncryptedVaultBackup = {
  file: Blob;
  exportedAt: string;
  documentCount: number;
};

export type BackupImportReport = {
  formatVersion: 1;
  exportedAt: string;
  documentCount: number;
  checks: readonly string[];
};

type SerializedVaultBackup = {
  format: "signlocal-encrypted-vault-backup";
  version: 1;
  exportedAt: string;
  vault: { version: 1; salt: string; verifier: string; verifierIv: string };
  documents: Array<{ id: string; name: string; createdAt: string; size: number; iv: string; ciphertext: string }>;
};

const DB_NAME = "signlocal-local-documents";
const LEGACY_STORE = "signed-pdfs";
const ENCRYPTED_STORE = "encrypted-signed-pdfs";
const SETTINGS_STORE = "vault-settings";
const DB_VERSION = 2;
const VERIFIER_TEXT = "signlocal-local-vault-verifier-v1";
const PBKDF2_ITERATIONS = 600_000;

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokaler Speicherfehler"));
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Lokaler Speichervorgang fehlgeschlagen"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Lokaler Speichervorgang abgebrochen"));
  });
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function encodeBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    const chunk = bytes.subarray(offset, offset + 0x8000);
    for (let index = 0; index < chunk.length; index += 1) binary += String.fromCharCode(chunk[index]);
  }
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function parseEncryptedVaultBackup(value: unknown): SerializedVaultBackup {
  if (!value || typeof value !== "object") throw new Error("Die Backup-Datei ist ungültig.");
  const backup = value as Partial<SerializedVaultBackup>;
  if (backup.format !== "signlocal-encrypted-vault-backup" || backup.version !== 1 || typeof backup.exportedAt !== "string" || Number.isNaN(Date.parse(backup.exportedAt)) || !backup.vault || !Array.isArray(backup.documents)) throw new Error("Dieses Backup-Format wird nicht unterstützt.");
  if (backup.vault.version !== 1 || typeof backup.vault.salt !== "string" || typeof backup.vault.verifier !== "string" || typeof backup.vault.verifierIv !== "string") throw new Error("Die Tresordaten im Backup sind unvollständig.");
  for (const document of backup.documents) {
    if (!document || typeof document.id !== "string" || typeof document.name !== "string" || typeof document.createdAt !== "string" || typeof document.size !== "number" || typeof document.iv !== "string" || typeof document.ciphertext !== "string") throw new Error("Mindestens ein Dokument im Backup ist ungültig.");
  }
  return backup as SerializedVaultBackup;
}

async function openArchive() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(LEGACY_STORE)) database.createObjectStore(LEGACY_STORE, { keyPath: "id" });
    if (!database.objectStoreNames.contains(ENCRYPTED_STORE)) database.createObjectStore(ENCRYPTED_STORE, { keyPath: "id" });
    if (!database.objectStoreNames.contains(SETTINGS_STORE)) database.createObjectStore(SETTINGS_STORE, { keyPath: "id" });
  };
  return requestToPromise(request);
}

async function deriveKey(passphrase: string, salt: ArrayBuffer) {
  const material = await crypto.subtle.importKey("raw", textBytes(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptBytes(key: CryptoKey, plaintext: BufferSource) {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: iv.buffer, ciphertext };
}

async function decryptBytes(key: CryptoKey, iv: ArrayBuffer, ciphertext: ArrayBuffer) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, ciphertext);
}

async function getSettings() {
  const database = await openArchive();
  try {
    const transaction = database.transaction(SETTINGS_STORE, "readonly");
    const settings = await requestToPromise(transaction.objectStore(SETTINGS_STORE).get("vault-settings")) as VaultSettings | undefined;
    await transactionToPromise(transaction);
    return settings ?? null;
  } finally {
    database.close();
  }
}

async function saveSettings(settings: VaultSettings) {
  const database = await openArchive();
  try {
    const transaction = database.transaction(SETTINGS_STORE, "readwrite");
    transaction.objectStore(SETTINGS_STORE).put(settings);
    await transactionToPromise(transaction);
  } finally {
    database.close();
  }
}

async function listLegacyDocuments() {
  const database = await openArchive();
  try {
    const transaction = database.transaction(LEGACY_STORE, "readonly");
    const documents = await requestToPromise(transaction.objectStore(LEGACY_STORE).getAll()) as LocalSignedDocument[];
    await transactionToPromise(transaction);
    return documents;
  } finally {
    database.close();
  }
}

async function deleteLegacyDocument(id: string) {
  const database = await openArchive();
  try {
    const transaction = database.transaction(LEGACY_STORE, "readwrite");
    transaction.objectStore(LEGACY_STORE).delete(id);
    await transactionToPromise(transaction);
  } finally {
    database.close();
  }
}

export async function hasVaultSettings() {
  return Boolean(await getSettings());
}

export async function getVaultSettings() {
  return getSettings();
}

export async function createLocalVault(passphrase: string) {
  if (passphrase.length < 12) throw new Error("Wähle ein Passwort mit mindestens 12 Zeichen.");
  const salt = randomBytes(16).buffer;
  const key = await deriveKey(passphrase, salt);
  const verifier = await encryptBytes(key, textBytes(VERIFIER_TEXT));
  const settings: VaultSettings = { id: "vault-settings", version: 1, salt, verifier: verifier.ciphertext, verifierIv: verifier.iv };
  await saveSettings(settings);
  await migrateLegacyDocuments(key);
  return key;
}

export async function unlockLocalVault(passphrase: string) {
  const settings = await getSettings();
  if (!settings) throw new Error("Der lokale Tresor wurde noch nicht eingerichtet.");
  const key = await deriveKey(passphrase, settings.salt);
  const plaintext = await decryptBytes(key, settings.verifierIv, settings.verifier);
  if (new TextDecoder().decode(plaintext) !== VERIFIER_TEXT) throw new Error("Falsches Passwort.");
  return key;
}

export async function changeLocalVaultPassword(currentPassphrase: string, nextPassphrase: string, onProgress?: (progress: VaultRotationProgress) => void) {
  if (nextPassphrase.length < 12) throw new Error("Wähle ein neues Passwort mit mindestens 12 Zeichen.");
  const settings = await getSettings();
  if (!settings) throw new Error("Der lokale Tresor wurde noch nicht eingerichtet.");
  const currentKey = await unlockLocalVault(currentPassphrase);
  const nextSalt = randomBytes(16).buffer;
  const nextKey = await deriveKey(nextPassphrase, nextSalt);
  const nextVerifier = await encryptBytes(nextKey, textBytes(VERIFIER_TEXT));

  const readDatabase = await openArchive();
  let existing: EncryptedSignedDocument[];
  try {
    const transaction = readDatabase.transaction(ENCRYPTED_STORE, "readonly");
    existing = await requestToPromise(transaction.objectStore(ENCRYPTED_STORE).getAll()) as EncryptedSignedDocument[];
    await transactionToPromise(transaction);
  } finally {
    readDatabase.close();
  }

  onProgress?.({ stage: "preparing", completed: 0, total: existing.length });
  const reencrypted: EncryptedSignedDocument[] = [];
  for (let index = 0; index < existing.length; index += 1) {
    const document = existing[index];
    const plaintext = await decryptBytes(currentKey, document.iv, document.ciphertext);
    const encrypted = await encryptBytes(nextKey, plaintext);
    reencrypted.push({ ...document, iv: encrypted.iv, ciphertext: encrypted.ciphertext });
    onProgress?.({ stage: "processing", completed: index + 1, total: existing.length });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const writeDatabase = await openArchive();
  try {
    onProgress?.({ stage: "saving", completed: existing.length, total: existing.length });
    const transaction = writeDatabase.transaction([ENCRYPTED_STORE, SETTINGS_STORE], "readwrite");
    const documentStore = transaction.objectStore(ENCRYPTED_STORE);
    reencrypted.forEach((document) => documentStore.put(document));
    transaction.objectStore(SETTINGS_STORE).put({ ...settings, salt: nextSalt, verifier: nextVerifier.ciphertext, verifierIv: nextVerifier.iv } satisfies VaultSettings);
    await transactionToPromise(transaction);
    onProgress?.({ stage: "complete", completed: existing.length, total: existing.length });
    return nextKey;
  } finally {
    writeDatabase.close();
  }
}

export async function exportEncryptedVaultBackup(): Promise<EncryptedVaultBackup> {
  const database = await openArchive();
  try {
    const transaction = database.transaction([ENCRYPTED_STORE, SETTINGS_STORE], "readonly");
    const settings = await requestToPromise(transaction.objectStore(SETTINGS_STORE).get("vault-settings")) as VaultSettings | undefined;
    const documents = await requestToPromise(transaction.objectStore(ENCRYPTED_STORE).getAll()) as EncryptedSignedDocument[];
    await transactionToPromise(transaction);
    if (!settings) throw new Error("Der lokale Tresor wurde noch nicht eingerichtet.");

    const exportedAt = new Date().toISOString();
    const backup = {
      format: "signlocal-encrypted-vault-backup",
      version: 1,
      exportedAt,
      vault: {
        version: settings.version,
        salt: encodeBase64(settings.salt),
        verifier: encodeBase64(settings.verifier),
        verifierIv: encodeBase64(settings.verifierIv),
      },
      documents: documents.map((document) => ({
        id: document.id,
        name: document.name,
        createdAt: document.createdAt,
        size: document.size,
        iv: encodeBase64(document.iv),
        ciphertext: encodeBase64(document.ciphertext),
      })),
    };

    return {
      exportedAt,
      documentCount: documents.length,
      file: new Blob([JSON.stringify(backup)], { type: "application/vnd.signlocal.vault-backup+json" }),
    };
  } finally {
    database.close();
  }
}

export async function importEncryptedVaultBackup(file: Blob) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Die Backup-Datei konnte nicht gelesen werden.");
  }
  const backup = parseEncryptedVaultBackup(parsed);
  let settings: VaultSettings;
  let documents: EncryptedSignedDocument[];
  try {
    settings = {
      id: "vault-settings",
      version: 1,
      salt: decodeBase64(backup.vault.salt),
      verifier: decodeBase64(backup.vault.verifier),
      verifierIv: decodeBase64(backup.vault.verifierIv),
    };
    documents = backup.documents.map((document) => ({
      id: document.id,
      name: document.name,
      createdAt: document.createdAt,
      size: document.size,
      iv: decodeBase64(document.iv),
      ciphertext: decodeBase64(document.ciphertext),
    }));
  } catch {
    throw new Error("Die verschlüsselten Daten im Backup sind beschädigt.");
  }

  const database = await openArchive();
  try {
    const transaction = database.transaction([ENCRYPTED_STORE, SETTINGS_STORE], "readwrite");
    const documentStore = transaction.objectStore(ENCRYPTED_STORE);
    documentStore.clear();
    documents.forEach((document) => documentStore.put(document));
    transaction.objectStore(SETTINGS_STORE).put(settings);
    await transactionToPromise(transaction);
    return {
      formatVersion: backup.version,
      exportedAt: backup.exportedAt,
      documentCount: backup.documents.length,
      checks: [
        "Backup-Datei lokal gelesen",
        "Signlocal-Tresorformat und Version 1 erkannt",
        "Tresorparameter auf Vollständigkeit geprüft",
        `${backup.documents.length} verschlüsselte Dokumentdatensätze auf Vollständigkeit geprüft`,
        "Verschlüsselte Datenfelder erfolgreich dekodiert",
        "Tresor atomar in den lokalen Speicher übernommen",
      ],
    } satisfies BackupImportReport;
  } finally {
    database.close();
  }
}

export async function listEncryptedDocuments(key: CryptoKey) {
  const database = await openArchive();
  try {
    const transaction = database.transaction(ENCRYPTED_STORE, "readonly");
    const encrypted = await requestToPromise(transaction.objectStore(ENCRYPTED_STORE).getAll()) as EncryptedSignedDocument[];
    await transactionToPromise(transaction);
    const documents = await Promise.all(encrypted.map(async (document) => ({
      id: document.id,
      name: document.name,
      createdAt: document.createdAt,
      size: document.size,
      pdf: new Blob([await decryptBytes(key, document.iv, document.ciphertext)], { type: "application/pdf" }),
    })));
    return documents.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  } finally {
    database.close();
  }
}

export async function saveEncryptedDocument(key: CryptoKey, document: LocalSignedDocument) {
  const encrypted = await encryptBytes(key, await document.pdf.arrayBuffer());
  const database = await openArchive();
  try {
    const transaction = database.transaction(ENCRYPTED_STORE, "readwrite");
    transaction.objectStore(ENCRYPTED_STORE).put({ id: document.id, name: document.name, createdAt: document.createdAt, size: document.size, iv: encrypted.iv, ciphertext: encrypted.ciphertext } satisfies EncryptedSignedDocument);
    await transactionToPromise(transaction);
  } finally {
    database.close();
  }
}

export async function deleteEncryptedDocument(id: string) {
  const database = await openArchive();
  try {
    const transaction = database.transaction(ENCRYPTED_STORE, "readwrite");
    transaction.objectStore(ENCRYPTED_STORE).delete(id);
    await transactionToPromise(transaction);
  } finally {
    database.close();
  }
}

async function migrateLegacyDocuments(key: CryptoKey) {
  const legacyDocuments = await listLegacyDocuments();
  for (const document of legacyDocuments) {
    await saveEncryptedDocument(key, document);
    await deleteLegacyDocument(document.id);
  }
}

export async function isPlatformAuthenticatorAvailable() {
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

export async function enableFaceIdGate() {
  const settings = await getSettings();
  if (!settings) throw new Error("Richte zuerst den lokalen Tresor ein.");
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "Signlocal lokaler Tresor" },
      user: { id: randomBytes(32), name: "signlocal-lokal", displayName: "Signlocal lokaler Tresor" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60_000,
      attestation: "none",
    },
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error("Geräteauthentifizierung wurde nicht eingerichtet.");
  await saveSettings({ ...settings, faceIdCredentialId: credential.rawId });
}

export async function verifyFaceIdGate() {
  const settings = await getSettings();
  if (!settings?.faceIdCredentialId) return false;
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: "public-key", id: settings.faceIdCredentialId, transports: ["internal"] }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  return Boolean(credential);
}

export async function requestLocalPersistence() {
  if (!("storage" in navigator) || !navigator.storage.persist) return false;
  return navigator.storage.persist();
}

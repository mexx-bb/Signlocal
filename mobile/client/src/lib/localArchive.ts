/** Lokales Signlocal-Archiv: Dokumente bleiben ausschließlich im IndexedDB-Speicher des Geräts. */
export type LocalSignedDocument = {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  pdf: Blob;
};

const DB_NAME = "signlocal-local-documents";
const STORE_NAME = "signed-pdfs";
const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokaler Speicherfehler"));
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Lokaler Speicherfehler"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Lokaler Speichervorgang abgebrochen"));
  });
}

async function openArchive() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
  };
  return requestToPromise(request);
}

export async function listLocalSignedDocuments() {
  const db = await openArchive();
  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const documents = await requestToPromise(transaction.objectStore(STORE_NAME).getAll()) as LocalSignedDocument[];
    await transactionToPromise(transaction);
    return documents.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  } finally {
    db.close();
  }
}

export async function saveLocalSignedDocument(document: LocalSignedDocument) {
  const db = await openArchive();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(document);
    await transactionToPromise(transaction);
  } finally {
    db.close();
  }
}

export async function deleteLocalSignedDocument(id: string) {
  const db = await openArchive();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionToPromise(transaction);
  } finally {
    db.close();
  }
}

export async function requestLocalPersistence() {
  if (!("storage" in navigator) || !navigator.storage.persist) return false;
  return navigator.storage.persist();
}

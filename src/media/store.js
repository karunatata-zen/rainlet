// IndexedDB for the heavy data. localStorage caps out around 5MB and is
// string-only, so a single song would blow it; IndexedDB stores blobs natively.

import { DB_NAME, DB_VERSION } from "../config.js";

const STORE_BACKGROUNDS = "backgrounds";

// Left over from the build that had a music and a video shelf. Dropped on
// upgrade so anyone who imported files then gets that space back.
const LEGACY_STORES = ["tracks", "videos"];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is unavailable in this browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of LEGACY_STORES) {
        if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
      }
      if (!db.objectStoreNames.contains(STORE_BACKGROUNDS)) {
        db.createObjectStore(STORE_BACKGROUNDS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = fn(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Ask the browser not to evict us at the first sign of storage pressure.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Non-fatal: the data still works, it is just more evictable.
  }
  return false;
}

export async function estimateUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return { usage, quota, ratio: quota ? usage / quota : 0 };
    }
  } catch {
    // Fall through to the unknown case.
  }
  return { usage: 0, quota: 0, ratio: 0 };
}

// One row, keyed "current": there is only ever one custom backdrop.
const BACKGROUND_KEY = "current";

export async function saveBackground(record) {
  const entry = { ...record, id: BACKGROUND_KEY };
  await tx(STORE_BACKGROUNDS, "readwrite", (store) => store.put(entry));
  return entry;
}

export async function getBackground() {
  const db = await openDb();
  const transaction = db.transaction(STORE_BACKGROUNDS, "readonly");
  return requestValue(
    transaction.objectStore(STORE_BACKGROUNDS).get(BACKGROUND_KEY),
  );
}

export async function deleteBackground() {
  await tx(STORE_BACKGROUNDS, "readwrite", (store) =>
    store.delete(BACKGROUND_KEY),
  );
}

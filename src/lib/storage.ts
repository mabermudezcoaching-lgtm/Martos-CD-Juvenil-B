/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = "martos_cd_app_db_v1";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Save arbitrary data to IndexedDB
 */
export async function saveToIndexedDB<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => {
        console.warn(`IndexedDB put error for key ${key}:`, e);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB save failed for ${key}:`, err);
    return false;
  }
}

/**
 * Retrieve data from IndexedDB
 */
export async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined ? (request.result as T) : null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB get failed for ${key}:`, err);
    return null;
  }
}

/**
 * Unified storage saver:
 * Saves permanently in IndexedDB (allowing unlimited high-res photos).
 * Also mirrors to localStorage safely with quota error protection.
 */
export async function persistData<T>(key: string, value: T): Promise<void> {
  // 1. Authoritative permanent store: IndexedDB
  await saveToIndexedDB(key, value);

  // 2. LocalStorage mirror with try/catch quota protection
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (e) {
    // QuotaExceededError is gracefully caught because IndexedDB already stored it safely
    console.warn(`localStorage quota exceeded for key "${key}". Data is safely retained in IndexedDB.`, e);
  }
}

/**
 * Unified storage loader:
 * Checks IndexedDB first for the most complete and fresh data.
 * Falls back to localStorage, and finally the provided fallback.
 */
export async function loadPersistedData<T>(key: string, fallback: T): Promise<T> {
  // 1. Try IndexedDB
  try {
    const fromIdb = await getFromIndexedDB<T>(key);
    if (fromIdb !== null && fromIdb !== undefined) {
      return fromIdb;
    }
  } catch (e) {
    console.warn(`Could not load ${key} from IndexedDB:`, e);
  }

  // 2. Try localStorage
  try {
    const fromLs = localStorage.getItem(key);
    if (fromLs) {
      return JSON.parse(fromLs) as T;
    }
  } catch (e) {
    console.warn(`Could not load ${key} from localStorage:`, e);
  }

  return fallback;
}

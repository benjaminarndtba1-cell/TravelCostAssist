// Receipt Upload Service für Firebase Storage
// Verwaltet das Hochladen und Löschen von Belegen

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../config/firebase';

/**
 * Lädt ein Beleg-Foto zu Firebase Storage hoch
 * @param {string} uri - Lokaler URI des Fotos (file:// oder blob:)
 * @param {string} expenseId - ID der zugehörigen Expense
 * @returns {Promise<string|null>} - Download-URL des hochgeladenen Bildes oder null bei Fehler
 */
export const uploadReceipt = async (uri, expenseId) => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('Benutzer nicht angemeldet');
    }

    // Dateiname generieren: timestamp_random.jpg
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${random}.jpg`;

    // Storage-Pfad: receipts/{userId}/{expenseId}/{fileName}
    const storagePath = `receipts/${userId}/${expenseId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Konvertiere URI zu Blob
    const blob = await uriToBlob(uri);

    // Upload zu Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg'
    });

    // Download-URL abrufen
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Receipt erfolgreich hochgeladen:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Fehler beim Upload des Receipts:', error);
    return null;
  }
};

/**
 * Löscht ein Beleg-Foto aus Firebase Storage
 * @param {string} downloadURL - Die Download-URL des zu löschenden Bildes
 * @returns {Promise<boolean>} - true bei Erfolg, false bei Fehler
 */
export const deleteReceipt = async (downloadURL) => {
  try {
    if (!downloadURL) return false;

    // Extrahiere Storage-Pfad aus Download-URL
    // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const pathMatch = downloadURL.match(/\/o\/(.+?)\?/);
    if (!pathMatch) {
      throw new Error('Ungültige Download-URL');
    }

    const storagePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, storagePath);

    // Lösche aus Firebase Storage
    await deleteObject(storageRef);

    console.log('Receipt erfolgreich gelöscht:', storagePath);
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen des Receipts:', error);
    return false;
  }
};

/**
 * Lädt mehrere Receipts gleichzeitig hoch
 * @param {string[]} uris - Array von lokalen URIs
 * @param {string} expenseId - ID der zugehörigen Expense
 * @returns {Promise<string[]>} - Array von Download-URLs
 */
export const uploadMultipleReceipts = async (uris, expenseId) => {
  try {
    const uploadPromises = uris.map((uri) => uploadReceipt(uri, expenseId));
    const downloadURLs = await Promise.all(uploadPromises);

    // Filter fehlgeschlagene Uploads (null)
    return downloadURLs.filter((url) => url !== null);
  } catch (error) {
    console.error('Fehler beim Upload mehrerer Receipts:', error);
    return [];
  }
};

/**
 * Löscht mehrere Receipts gleichzeitig
 * @param {string[]} downloadURLs - Array von Download-URLs
 * @returns {Promise<boolean>} - true wenn alle erfolgreich gelöscht wurden
 */
export const deleteMultipleReceipts = async (downloadURLs) => {
  try {
    const deletePromises = downloadURLs.map((url) => deleteReceipt(url));
    const results = await Promise.all(deletePromises);

    // Prüfe ob alle erfolgreich waren
    return results.every((result) => result === true);
  } catch (error) {
    console.error('Fehler beim Löschen mehrerer Receipts:', error);
    return false;
  }
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Konvertiert einen URI zu einem Blob für Firebase Upload
 * @param {string} uri - Lokaler URI (file:// oder blob:)
 * @returns {Promise<Blob>} - Blob-Objekt
 */
const uriToBlob = async (uri) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
      resolve(xhr.response);
    };

    xhr.onerror = function (e) {
      console.error('XMLHttpRequest Error:', e);
      reject(new TypeError('Network request failed'));
    };

    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

export default {
  uploadReceipt,
  deleteReceipt,
  uploadMultipleReceipts,
  deleteMultipleReceipts
};

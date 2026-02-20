import CryptoJS from "crypto-js";

/**
 * Derive 256-bit AES key from master password
 */
export const deriveKey = (masterPassword, salt) => {
  return CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  }).toString();
};

/**
 * Encrypt password using AES
 */
export const encryptPassword = (plainText, key) => {
  return CryptoJS.AES.encrypt(plainText, key).toString();
};

/**
 * Decrypt password using AES
 */
export const decryptPassword = (cipherText, key) => {
  try{
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  const text = bytes.toString(CryptoJS.enc.Utf8);
    return text || "";
  } catch {
    return "";
  }
};
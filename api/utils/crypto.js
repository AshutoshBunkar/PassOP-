import CryptoJS from "crypto-js";

export const deriveKey = (password, salt) => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  }).toString();
};

export const encryptPassword = (text, key) => {
  return CryptoJS.AES.encrypt(text, key).toString();
};

export const decryptPassword = (cipher, key) => {
  const bytes = CryptoJS.AES.decrypt(cipher, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};
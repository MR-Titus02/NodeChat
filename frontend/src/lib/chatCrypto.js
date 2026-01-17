import CryptoJS from "crypto-js";

const SECRET_PREFIX = "chat-key-";

// one key per chat (user-to-user)
export const getChatKey = (userId) => {
  let key = localStorage.getItem(SECRET_PREFIX + userId);
  if (!key) {
    key = CryptoJS.lib.WordArray.random(32).toString(); // 256-bit
    localStorage.setItem(SECRET_PREFIX + userId, key);
  }
  return key;
};

export const encryptText = (plainText, key) => {
  if (!plainText) return plainText;
  return CryptoJS.AES.encrypt(plainText, key).toString();
};

export const decryptText = (cipherText, key) => {
  if (!cipherText) return cipherText;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "[Unable to decrypt]";
  }
};

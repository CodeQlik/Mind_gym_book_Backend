import crypto from "crypto";

// Use a consistent secret, ideally 32 characters for AES-256
const ENCRYPTION_KEY = process.env.ACCESS_TOKEN_SECRET;
const IV_LENGTH = 16;

/**
 * Encrypts a string (like an ID) into an obfuscated format.
 * @param {string|number} text
 * @returns {string} Encrypted string in hex
 */
export function encryptId(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      iv,
    );
    let encrypted = cipher.update(text.toString());
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("Encryption error:", error);
    return text.toString();
  }
}

/**
 * Decrypts an obfuscated string back into its original text.
 * @param {string} text hex:hex format
 * @returns {string|null} Decrypted text or null if failed
 */
export function decryptId(text) {
  try {
    if (!text || !text.includes(":")) return text; // Probably already a plain ID

    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails, it might be a plain ID
    return text;
  }
}

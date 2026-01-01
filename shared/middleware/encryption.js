const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY ||
    crypto.randomBytes(32).toString("hex").slice(0, 32),
  "utf8"
);
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (text) => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

const encryptionMiddleware = (req, res, next) => {
  if (req.body && req.body.encrypted) {
    try {
      const decrypted = decrypt(req.body.encrypted);
      req.body = JSON.parse(decrypted);
    } catch (error) {
      return res.status(400).json({
        error: "Invalid encrypted payload",
      });
    }
  }
  next();
};

module.exports = { encrypt, decrypt, encryptionMiddleware };

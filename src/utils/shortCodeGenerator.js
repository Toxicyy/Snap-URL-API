// Простая замена nanoid для тестов
const characters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateShortCode(length = 8) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function validateShortCode(code) {
  const errors = [];

  if (!code || code.length === 0) {
    errors.push("Short code is required");
    return { isValid: false, errors };
  }

  if (code.length < 3) {
    errors.push("Short code is too short (min 3 characters)");
  }

  if (code.length > 30) {
    errors.push("Short code is too long (max 30 characters)");
  }

  if (!/^[A-Za-z0-9_-]+$/.test(code)) {
    errors.push("Short code contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

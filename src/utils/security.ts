import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config(); // Carga las variables de entorno

const secretApplicationKey = (process.env.APLICATIONKEY || '').trim();

if (!secretApplicationKey) {
  throw new Error('No se encontró la clave secreta APLICATIONKEY en el archivo .env');
}

if (![16, 24, 32].includes(Buffer.from(secretApplicationKey, 'utf8').length)) {
  throw new Error('La clave secreta APLICATIONKEY debe tener 16, 24 o 32 caracteres para AES-128/192/256');
}

/**
 * Encripta una clave usando AES/ECB/PKCS5Padding
 * @param key Clave a encriptar
 * @returns Clave encriptada en base64
 */
export function keyEncrypt(key: string): string {
  try {

    if (!key || key.trim() === '') return ''; // ⬅️ Manejo de valor nulo o vacío
    
    const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(secretApplicationKey, 'utf8'), null);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()]);
    return encrypted.toString('base64');
  } catch (error) {
    throw new Error(`Error al encriptar el key de la Institución. ${error}`);
  }
}

/**
 * Desencripta una clave encriptada con AES/ECB/PKCS5Padding
 * @param encryptedKey Clave encriptada en base64
 * @returns Clave desencriptada en texto plano
 */
export function keyDecrypt(encryptedKey: string): string {
  try {
    
    if (!encryptedKey || encryptedKey.trim() === '') return ''; // ⬅️ Manejo de valor nulo o vacío

    const decipher = crypto.createDecipheriv('aes-256-ecb', Buffer.from(secretApplicationKey, 'utf8'), null);
    decipher.setAutoPadding(true);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedKey, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Error al desencriptar el key de la Institución. ${error}`);
  }
}

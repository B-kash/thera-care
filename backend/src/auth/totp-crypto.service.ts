import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

@Injectable()
export class TotpCryptoService {
  constructor(private readonly config: ConfigService) {}

  private deriveKey(): Buffer {
    const b64 = this.config.get<string>('TOTP_ENCRYPTION_KEY')?.trim();
    if (b64) {
      const buf = Buffer.from(b64, 'base64');
      if (buf.length !== 32) {
        throw new Error(
          'TOTP_ENCRYPTION_KEY must be base64 encoding of exactly 32 bytes',
        );
      }
      return buf;
    }
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    return scryptSync(secret, 'thera_care_totp_v1', 32);
  }

  encryptUtf8(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.deriveKey(), iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decryptUtf8(payloadB64: string): string {
    const buf = Buffer.from(payloadB64, 'base64');
    if (buf.length < IV_LEN + TAG_LEN + 1) {
      throw new Error('Invalid encrypted payload');
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.deriveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      'utf8',
    );
  }
}

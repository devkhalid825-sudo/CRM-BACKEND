import { test, describe } from 'node:test';
import assert from 'node:assert';
import { encrypt, decrypt, maskKey } from './crypto.js';

describe('Crypto Service', () => {
  test('encrypts and decrypts text accurately using AES-256-GCM', () => {
    const secretText = 'AIzaSyExampleSecretKeyForTesting12345';
    const encrypted = encrypt(secretText);

    assert.notStrictEqual(encrypted, secretText);
    assert.strictEqual(encrypted.split(':').length, 3, 'Payload should have iv:authTag:ciphertext');

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, secretText);
  });

  test('different encryptions produce different ciphertexts (random IV)', () => {
    const text = 'same-plain-text';
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    assert.notStrictEqual(enc1, enc2);
    assert.strictEqual(decrypt(enc1), text);
    assert.strictEqual(decrypt(enc2), text);
  });

  test('maskKey masks keys properly preserving first 4 and last 4 characters', () => {
    assert.strictEqual(maskKey('AIzaSyD-1234567890abcdef9f2'), 'AIza****f9f2');
    assert.strictEqual(maskKey('short'), '****');
    assert.strictEqual(maskKey('12345678'), '****');
    assert.strictEqual(maskKey('123456789'), '1234****6789');
  });
});

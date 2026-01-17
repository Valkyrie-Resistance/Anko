//! Password encryption using AES-256-GCM.
//!
//! This module handles encryption of database passwords before storing them locally.
//! We use AES-256-GCM for authenticated encryption.
//!
//! # Security Architecture
//!
//! **PBKDF2 Key Derivation**
//! - Derives key from machine ID with 100,000 iterations
//! - Deterministic: same machine = same key (reliable across app restarts)
//!
//! Each encrypted password includes a random 12-byte nonce to ensure that
//! identical passwords encrypt to different ciphertexts.
//!
//! # Security Notes
//!
//! - Passwords are encrypted at rest (in SQLite database)
//! - Encryption key never leaves the machine
//! - Each password gets a unique random nonce
//! - AES-GCM provides both confidentiality AND authenticity

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use pbkdf2::{
    password_hash::{PasswordHasher, SaltString},
    Pbkdf2,
};
use rand::Rng;

use crate::error::AppError;

/// Size of AES-256 encryption key in bytes (256 bits = 32 bytes)
const KEY_SIZE: usize = 32;
/// Size of GCM nonce in bytes (96 bits = 12 bytes, as per GCM spec)
const NONCE_SIZE: usize = 12;

/// AES-256-GCM password encryptor with PBKDF2 key derivation.
///
/// Encrypts database passwords using AES-256-GCM.
/// The encryption key is derived from the machine ID using PBKDF2,
/// ensuring deterministic key generation across app restarts.
pub struct Encryptor {
    cipher: Aes256Gcm,
}

impl Encryptor {
    /// Create a new Encryptor with PBKDF2 key derivation.
    ///
    /// Derives the encryption key from the machine ID using PBKDF2 with
    /// 100,000 iterations. This is deterministic: same machine = same key.
    pub fn new() -> Result<Self, AppError> {
        let key = Self::derive_key()?;
        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| AppError::Encryption(e.to_string()))?;
        Ok(Self { cipher })
    }

    /// Encrypt a password with a fresh random nonce.
    ///
    /// The nonce is prepended to the ciphertext for decryption.
    /// Format: `[nonce (12 bytes)][ciphertext][auth tag]`
    pub fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, AppError> {
        let mut rng = rand::thread_rng();
        let nonce_bytes: [u8; NONCE_SIZE] = rng.gen();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| AppError::Encryption(e.to_string()))?;

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt password data encrypted with `encrypt`.
    ///
    /// Extracts the nonce from the encrypted data and decrypts the ciphertext.
    pub fn decrypt(&self, data: &[u8]) -> Result<String, AppError> {
        if data.len() < NONCE_SIZE {
            return Err(AppError::Encryption("Data too short".to_string()));
        }

        let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| AppError::Encryption(e.to_string()))?;

        String::from_utf8(plaintext).map_err(|e| AppError::Encryption(e.to_string()))
    }

    /// Derives encryption key from machine ID using PBKDF2 (100k iterations).
    ///
    /// Deterministic: same machine = same key across app restarts.
    fn derive_key() -> Result<[u8; KEY_SIZE], AppError> {
        let machine_id = machine_uid::get()
            .map_err(|e| AppError::Encryption(format!("Failed to get machine ID: {}", e)))?;

        let salt = SaltString::encode_b64(b"anko-sql-client-salt-v1-do-not-change")
            .map_err(|e| AppError::Encryption(format!("Failed to create salt: {}", e)))?;

        let hash = Pbkdf2
            .hash_password(machine_id.as_bytes(), &salt)
            .map_err(|e| AppError::Encryption(format!("PBKDF2 failed: {}", e)))?;

        let hash_output = hash
            .hash
            .ok_or_else(|| AppError::Encryption("PBKDF2 produced no hash".to_string()))?;

        let hash_bytes = hash_output.as_bytes().to_vec();

        if hash_bytes.len() < KEY_SIZE {
            return Err(AppError::Encryption(format!(
                "PBKDF2 hash too short: {} < {}",
                hash_bytes.len(),
                KEY_SIZE
            )));
        }

        let mut key = [0u8; KEY_SIZE];
        key.copy_from_slice(&hash_bytes[..KEY_SIZE]);

        Ok(key)
    }
}

impl Default for Encryptor {
    fn default() -> Self {
        Self::new().expect("Failed to create encryptor")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let encryptor = Encryptor::new().unwrap();
        let plaintext = "my_secret_password";

        let encrypted = encryptor.encrypt(plaintext).unwrap();
        let decrypted = encryptor.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_key_derivation_is_deterministic() {
        // Key derivation should return the same key for the same machine
        let key1 = Encryptor::derive_key().unwrap();
        let key2 = Encryptor::derive_key().unwrap();

        assert_eq!(key1, key2, "Key derivation should be deterministic");
        assert_eq!(key1.len(), KEY_SIZE);
    }

    #[test]
    fn test_encryption_persistence_within_same_encryptor() {
        // Test that the same encryptor instance can encrypt and decrypt
        let encryptor = Encryptor::new().unwrap();
        let plaintext = "super_secret_database_password_123";

        let encrypted = encryptor.encrypt(plaintext).unwrap();
        let decrypted = encryptor.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted, "Should decrypt with same encryptor instance");
    }

    #[test]
    fn test_multiple_passwords() {
        // Test encrypting and decrypting multiple different passwords
        let encryptor = Encryptor::new().unwrap();

        let passwords = vec![
            "simple_password",
            "complex!P@ssw0rd#123",
            "unicode_密码_🔐",
            "very_long_password_that_is_much_longer_than_typical_to_test_edge_cases_12345678901234567890",
        ];

        for password in passwords {
            let encrypted = encryptor.encrypt(password).unwrap();
            let decrypted = encryptor.decrypt(&encrypted).unwrap();
            assert_eq!(password, decrypted, "Failed for password: {}", password);
        }
    }

    #[test]
    fn test_decrypt_invalid_data() {
        let encryptor = Encryptor::new().unwrap();

        // Test with data that's too short
        let result = encryptor.decrypt(&[1, 2, 3]);
        assert!(result.is_err(), "Should fail with data too short");

        // Test with random garbage data
        let garbage = vec![0u8; 50];
        let result = encryptor.decrypt(&garbage);
        assert!(result.is_err(), "Should fail with garbage data");
    }

}

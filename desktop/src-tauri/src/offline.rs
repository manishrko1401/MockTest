// Offline tests: a secure local store for downloaded mock / typing tests.
//
// - This PC gets its own X25519 key pair. The private key is kept with Windows DPAPI, so it
//   only works for this Windows account on this PC (copying the folder elsewhere is useless).
// - The server encrypts each downloaded test for this device's public key (ephemeral X25519
//   + HKDF-SHA256 + AES-256-GCM). The package is stored exactly as received; it is only
//   decrypted in memory when a test is opened, never written to disk readable.
// - Each package carries its own expiry inside the encrypted data (it can't be edited), and
//   moving the PC clock back doesn't extend it.
// - Offline attempts and the results waiting to be uploaded are encrypted with a key derived
//   from the device key.

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use hkdf::Hkdf;
use serde_json::{json, Value};
use sha2::Sha256;
use tauri::{AppHandle, Manager};
use x25519_dalek::{PublicKey, StaticSecret};

const MAX_PACKAGE_BYTES: usize = 40 * 1024 * 1024;
const KINDS: [&str; 3] = ["mock", "typing", "bookmarks"];

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn random_bytes<const N: usize>() -> Result<[u8; N], String> {
    let mut b = [0u8; N];
    getrandom::getrandom(&mut b).map_err(|e| e.to_string())?;
    Ok(b)
}

fn store_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("offline");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn check_kind_id(kind: &str, id: &str) -> Result<(), String> {
    if !KINDS.contains(&kind) {
        return Err("Unknown test type".into());
    }
    if id.is_empty() || id.len() > 120 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return Err("Invalid test id".into());
    }
    Ok(())
}

// ---------- Windows DPAPI ----------

#[cfg(windows)]
fn dpapi(data: &[u8], protect: bool) -> Result<Vec<u8>, String> {
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB};
    let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        if protect {
            CryptProtectData(&input, windows::core::w!("Mock Test Hub offline key"), None, None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut output)
        } else {
            CryptUnprotectData(&input, None, None, None, None, CRYPTPROTECT_UI_FORBIDDEN, &mut output)
        }
        .map_err(|e| e.to_string())?;
        let out = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData as *mut core::ffi::c_void)));
        Ok(out)
    }
}

#[cfg(not(windows))]
fn dpapi(_data: &[u8], _protect: bool) -> Result<Vec<u8>, String> {
    Err("Offline tests need Windows".into())
}

/// This device's secret key (created on first use, kept with DPAPI).
fn device_secret(app: &AppHandle) -> Result<StaticSecret, String> {
    let path = store_dir(app)?.join("device.key");
    if let Ok(sealed) = fs::read(&path) {
        if let Ok(raw) = dpapi(&sealed, false) {
            if raw.len() == 32 {
                let mut b = [0u8; 32];
                b.copy_from_slice(&raw);
                return Ok(StaticSecret::from(b));
            }
        }
        // Unreadable here (copied from another PC / account): start over with a new key
    }
    let raw: [u8; 32] = random_bytes()?;
    fs::write(&path, dpapi(&raw, true)?).map_err(|e| e.to_string())?;
    Ok(StaticSecret::from(raw))
}

fn derive_key(ikm: &[u8], salt: &[u8], info: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Hkdf::<Sha256>::new(Some(salt), ikm).expand(info, &mut key).map_err(|_| "Key derivation failed".to_string())?;
    Ok(key)
}

// ---------- local (device-key) encryption for attempts / outbox ----------

fn local_key(app: &AppHandle) -> Result<[u8; 32], String> {
    let secret = device_secret(app)?;
    derive_key(secret.as_bytes(), b"mth-local", b"mth-local-v1")
}

fn seal_local(app: &AppHandle, value: &Value) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(&local_key(app)?).map_err(|e| e.to_string())?;
    let nonce: [u8; 12] = random_bytes()?;
    let ct = cipher.encrypt(Nonce::from_slice(&nonce), value.to_string().as_bytes()).map_err(|_| "Encryption failed".to_string())?;
    Ok([nonce.to_vec(), ct].concat())
}

fn open_local(app: &AppHandle, path: &PathBuf, default: Value) -> Value {
    let Ok(bytes) = fs::read(path) else { return default };
    if bytes.len() < 13 {
        return default;
    }
    let Ok(key) = local_key(app) else { return default };
    let Ok(cipher) = Aes256Gcm::new_from_slice(&key) else { return default };
    match cipher.decrypt(Nonce::from_slice(&bytes[..12]), &bytes[12..]) {
        Ok(plain) => serde_json::from_slice(&plain).unwrap_or(default),
        Err(_) => default,
    }
}

fn write_local(app: &AppHandle, path: &PathBuf, value: &Value) -> Result<(), String> {
    fs::write(path, seal_local(app, value)?).map_err(|e| e.to_string())
}

// ---------- index (titles, sizes, dates — nothing secret) ----------

fn index_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(store_dir(app)?.join("index.json"))
}

fn read_index(app: &AppHandle) -> Value {
    index_path(app)
        .ok()
        .and_then(|p| fs::read(p).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_else(|| json!({ "items": [], "lastSeen": 0 }))
}

fn write_index(app: &AppHandle, index: &Value) -> Result<(), String> {
    fs::write(index_path(app)?, index.to_string()).map_err(|e| e.to_string())
}

/// Latest time this store has seen. If the clock is moved back, expiry uses this instead.
fn trusted_now(app: &AppHandle) -> u64 {
    let mut index = read_index(app);
    let last = index["lastSeen"].as_u64().unwrap_or(0);
    let now = now_ms();
    if now > last {
        index["lastSeen"] = json!(now);
        let _ = write_index(app, &index);
        now
    } else {
        last
    }
}

fn package_path(app: &AppHandle, kind: &str, id: &str) -> Result<PathBuf, String> {
    Ok(store_dir(app)?.join(format!("{kind}-{id}.pkg")))
}

// ---------- commands ----------

/// This PC's public key (the server encrypts downloads for it).
#[tauri::command]
pub fn offline_device_key(app: AppHandle) -> Result<String, String> {
    let secret = device_secret(&app)?;
    Ok(B64.encode(PublicKey::from(&secret).as_bytes()))
}

/// Saves a downloaded (still encrypted) package and its listing info.
#[tauri::command]
pub fn offline_store(app: AppHandle, kind: String, id: String, meta: Value, envelope: String) -> Result<(), String> {
    check_kind_id(&kind, &id)?;
    if envelope.len() > MAX_PACKAGE_BYTES {
        return Err("This test is too large to download".into());
    }
    // Make sure it really opens on this device before keeping it
    let payload = decrypt_envelope(&app, &envelope)?;
    if payload["kind"] != json!(kind) || payload["id"] != json!(id) {
        return Err("Downloaded data doesn't match the test".into());
    }
    fs::write(package_path(&app, &kind, &id)?, envelope.as_bytes()).map_err(|e| e.to_string())?;

    let mut index = read_index(&app);
    let items = index["items"].as_array().cloned().unwrap_or_default();
    let mut items: Vec<Value> = items.into_iter().filter(|it| !(it["kind"] == json!(kind) && it["id"] == json!(id))).collect();
    items.push(json!({
        "kind": kind, "id": id,
        "title": meta["title"], "subtitle": meta["subtitle"], "questions": meta["questions"],
        "version": payload["version"], "expiresAt": payload["expiresAt"],
        "downloadedAt": now_ms(), "sizeBytes": envelope.len(),
    }));
    index["items"] = json!(items);
    write_index(&app, &index)
}

/// Downloaded tests (with an "expired" flag).
#[tauri::command]
pub fn offline_list(app: AppHandle) -> Value {
    let now = trusted_now(&app);
    let index = read_index(&app);
    let items: Vec<Value> = index["items"].as_array().cloned().unwrap_or_default().into_iter().map(|mut it| {
        let exp = it["expiresAt"].as_u64().unwrap_or(0);
        it["expired"] = json!(exp > 0 && now > exp);
        it
    }).collect();
    json!(items)
}

fn decrypt_envelope(app: &AppHandle, envelope: &str) -> Result<Value, String> {
    let env: Value = serde_json::from_str(envelope).map_err(|_| "Damaged download".to_string())?;
    let field = |k: &str| -> Result<Vec<u8>, String> {
        B64.decode(env[k].as_str().ok_or("Damaged download")?).map_err(|_| "Damaged download".to_string())
    };
    let (epk, salt, nonce, ct) = (field("epk")?, field("salt")?, field("nonce")?, field("ct")?);
    if epk.len() != 32 || nonce.len() != 12 {
        return Err("Damaged download".into());
    }
    let mut epk_b = [0u8; 32];
    epk_b.copy_from_slice(&epk);
    let shared = device_secret(app)?.diffie_hellman(&PublicKey::from(epk_b));
    let key = derive_key(shared.as_bytes(), &salt, b"mth-offline-v1")?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let plain = cipher
        .decrypt(Nonce::from_slice(&nonce), ct.as_ref())
        .map_err(|_| "This download can't be opened on this computer. Please download it again.".to_string())?;
    serde_json::from_slice(&plain).map_err(|_| "Damaged download".to_string())
}

/// Opens a downloaded test in memory (checks it hasn't expired).
#[tauri::command]
pub fn offline_open(app: AppHandle, kind: String, id: String) -> Result<Value, String> {
    check_kind_id(&kind, &id)?;
    let envelope = fs::read_to_string(package_path(&app, &kind, &id)?).map_err(|_| "This test isn't downloaded".to_string())?;
    let payload = decrypt_envelope(&app, &envelope)?;
    let exp = payload["expiresAt"].as_u64().unwrap_or(0);
    if exp > 0 && trusted_now(&app) > exp {
        return Err("EXPIRED".into());
    }
    Ok(payload)
}

#[tauri::command]
pub fn offline_delete(app: AppHandle, kind: String, id: String) -> Result<(), String> {
    check_kind_id(&kind, &id)?;
    let _ = fs::remove_file(package_path(&app, &kind, &id)?);
    let _ = fs::remove_file(store_dir(&app)?.join(format!("{kind}-{id}.att")));
    let mut index = read_index(&app);
    let items: Vec<Value> = index["items"].as_array().cloned().unwrap_or_default().into_iter()
        .filter(|it| !(it["kind"] == json!(kind) && it["id"] == json!(id))).collect();
    index["items"] = json!(items);
    write_index(&app, &index)
}

/// Saves an offline attempt (for offline analysis) and queues it for upload.
#[tauri::command]
pub fn offline_add_attempt(app: AppHandle, kind: String, id: String, attempt: Value) -> Result<(), String> {
    check_kind_id(&kind, &id)?;
    let att_path = store_dir(&app)?.join(format!("{kind}-{id}.att"));
    let mut list = open_local(&app, &att_path, json!([])).as_array().cloned().unwrap_or_default();
    list.insert(0, attempt.clone());
    list.truncate(10);
    write_local(&app, &att_path, &json!(list))?;

    let out_path = store_dir(&app)?.join("outbox.dat");
    let mut outbox = open_local(&app, &out_path, json!([])).as_array().cloned().unwrap_or_default();
    outbox.push(json!({ "kind": kind, "testId": id, "attempt": attempt, "queuedAt": now_ms() }));
    write_local(&app, &out_path, &json!(outbox))
}

/// Offline attempts of a test, newest first.
#[tauri::command]
pub fn offline_attempts(app: AppHandle, kind: String, id: String) -> Result<Value, String> {
    check_kind_id(&kind, &id)?;
    Ok(open_local(&app, &store_dir(&app)?.join(format!("{kind}-{id}.att")), json!([])))
}

/// Results waiting to be uploaded.
#[tauri::command]
pub fn outbox_list(app: AppHandle) -> Result<Value, String> {
    Ok(open_local(&app, &store_dir(&app)?.join("outbox.dat"), json!([])))
}

/// Removes uploaded results from the outbox (matched by their attempt "localId").
#[tauri::command]
pub fn outbox_remove(app: AppHandle, local_ids: Vec<String>) -> Result<(), String> {
    let out_path = store_dir(&app)?.join("outbox.dat");
    let outbox: Vec<Value> = open_local(&app, &out_path, json!([])).as_array().cloned().unwrap_or_default().into_iter()
        .filter(|it| !local_ids.iter().any(|l| it["attempt"]["localId"] == json!(l))).collect();
    write_local(&app, &out_path, &json!(outbox))
}

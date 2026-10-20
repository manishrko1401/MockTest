fn main() {
    // App commands get explicit permissions (allow-set-exam-mode, allow-exit-app), granted to the
    // website in capabilities/site.json
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&[
                "set_exam_mode", "exit_app",
                "offline_device_key", "offline_store", "offline_list", "offline_open", "offline_delete",
                "offline_add_attempt", "offline_attempts", "outbox_list", "outbox_remove",
            ])),
    )
    .expect("failed to run tauri-build");
}

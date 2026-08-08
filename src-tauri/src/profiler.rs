use sysinfo::System;

pub fn get_device_specs() -> String {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram = sys.total_memory();
    let available_ram = sys.available_memory();
    let cpus = sys.cpus();

    let specs = serde_json::json!({
        "os": System::long_os_version().unwrap_or_else(|| "unknown".into()),
        "arch": System::cpu_arch(),
        "cpu_brand": cpus.first().map(|c| c.brand().trim().to_string()).unwrap_or_default(),
        "cpu_cores": cpus.len(),
        "cpu_frequency_mhz": cpus.first().map(|c| c.frequency()).unwrap_or(0),
        "total_ram_bytes": total_ram,
        "available_ram_bytes": available_ram,
        "total_ram_gb": (total_ram as f64 / 1024.0 / 1024.0 / 1024.0 * 100.0).round() / 100.0,
        "available_ram_gb": (available_ram as f64 / 1024.0 / 1024.0 / 1024.0 * 100.0).round() / 100.0,
    });

    specs.to_string()
}

#[cfg(test)]
mod tests {
    #[test]
    fn specs_are_json_with_ram() {
        let v: serde_json::Value = serde_json::from_str(&super::get_device_specs()).unwrap();
        assert!(v["total_ram_bytes"].as_u64().unwrap() > 0);
    }
}

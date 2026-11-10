//! Génère l'icône Windows de Saturne et l'intègre à l'exécutable.
#[path = "src/icon.rs"]
mod icon;

use std::{env, fs, path::PathBuf};

/// Fichier .ico (images BMP 32 bits) contenant le logo à plusieurs tailles.
fn make_ico(sizes: &[u32]) -> Vec<u8> {
    let mut images: Vec<Vec<u8>> = Vec::new();
    for &s in sizes {
        let rgba = icon::render(s);
        let mut d = Vec::new();
        for v in [40u32, s, s * 2] {
            d.extend_from_slice(&v.to_le_bytes());
        }
        d.extend_from_slice(&1u16.to_le_bytes()); // plans
        d.extend_from_slice(&32u16.to_le_bytes()); // bits par pixel
        d.extend_from_slice(&[0u8; 24]); // compression, taille, résolution, palette
        for y in (0..s).rev() {
            for x in 0..s {
                let i = ((y * s + x) * 4) as usize;
                d.extend_from_slice(&[rgba[i + 2], rgba[i + 1], rgba[i], rgba[i + 3]]);
            }
        }
        d.extend(std::iter::repeat_n(0u8, (s.div_ceil(32) * 4 * s) as usize)); // masque (inutilisé avec l'alpha)
        images.push(d);
    }
    let mut out = vec![0, 0, 1, 0];
    out.extend_from_slice(&(sizes.len() as u16).to_le_bytes());
    let mut offset = 6 + 16 * sizes.len() as u32;
    for (s, img) in sizes.iter().zip(&images) {
        let b = if *s >= 256 { 0 } else { *s as u8 };
        out.extend_from_slice(&[b, b, 0, 0, 1, 0, 32, 0]);
        out.extend_from_slice(&(img.len() as u32).to_le_bytes());
        out.extend_from_slice(&offset.to_le_bytes());
        offset += img.len() as u32;
    }
    images.iter().for_each(|i| out.extend_from_slice(i));
    out
}

fn main() {
    println!("cargo:rerun-if-changed=src/icon.rs");
    println!("cargo:rerun-if-changed=build.rs");
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    let path = PathBuf::from(env::var("OUT_DIR").unwrap()).join("saturne.ico");
    fs::write(&path, make_ico(&[16, 32, 48, 64, 128])).unwrap();
    let mut res = winresource::WindowsResource::new();
    res.set_icon(path.to_str().unwrap());
    res.set("ProductName", "Saturne");
    res.set("FileDescription", "Saturne");
    res.compile().expect("impossible d'intégrer l'icône");
}

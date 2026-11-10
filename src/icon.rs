//! Logo de Saturne : une planète entourée d'un anneau.
//! Le même dessin sert à l'icône de la fenêtre et à celle de l'exécutable (voir `build.rs`).

const BG: [f32; 3] = [10.0, 10.0, 14.0];
const PLANET: [f32; 3] = [245.0, 245.0, 250.0];
const RING_FRONT: [f32; 3] = [139.0, 92.0, 246.0];
const RING_BACK: [f32; 3] = [96.0, 62.0, 190.0];

/// Couleur et opacité au point (x, y), avec x et y compris entre -1 et 1.
fn sample(x: f32, y: f32) -> ([f32; 3], f32) {
    // Carré aux coins arrondis.
    let r = 0.42;
    let (qx, qy) = (x.abs() - (1.0 - r), y.abs() - (1.0 - r));
    let dist = (qx.max(0.0).powi(2) + qy.max(0.0).powi(2)).sqrt() + qx.max(qy).min(0.0) - r;
    if dist > 0.0 {
        return (BG, 0.0);
    }
    // L'anneau est une ellipse inclinée de 22°.
    let (sn, cs) = (-22f32).to_radians().sin_cos();
    let (xr, yr) = (x * cs - y * sn, x * sn + y * cs);
    let e = (xr / 0.86).powi(2) + (yr / 0.29).powi(2);
    let ring = (0.6..=1.0).contains(&e);
    let planet = x * x + y * y <= 0.4 * 0.4;
    if ring && yr > 0.0 {
        (RING_FRONT, 1.0)
    } else if planet {
        (PLANET, 1.0)
    } else if ring {
        (RING_BACK, 1.0)
    } else {
        (BG, 1.0)
    }
}

/// Image RGBA de `size` × `size` pixels (lissée par suréchantillonnage 3×3).
pub fn render(size: u32) -> Vec<u8> {
    const SS: u32 = 3;
    let s = size as f32;
    let mut out = vec![0u8; (size * size * 4) as usize];
    for py in 0..size {
        for px in 0..size {
            let (mut rgb, mut alpha) = ([0f32; 3], 0f32);
            for sy in 0..SS {
                for sx in 0..SS {
                    let x = ((px as f32 + (sx as f32 + 0.5) / SS as f32) / s - 0.5) * 2.0;
                    let y = ((py as f32 + (sy as f32 + 0.5) / SS as f32) / s - 0.5) * 2.0;
                    let (c, a) = sample(x, y);
                    for k in 0..3 {
                        rgb[k] += c[k] * a;
                    }
                    alpha += a;
                }
            }
            let i = ((py * size + px) * 4) as usize;
            if alpha > 0.0 {
                for k in 0..3 {
                    out[i + k] = (rgb[k] / alpha).round() as u8;
                }
                out[i + 3] = (alpha / (SS * SS) as f32 * 255.0).round() as u8;
            }
        }
    }
    out
}

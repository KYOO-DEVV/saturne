//! Assemble l'interface : `web/index.html` est un squelette dont `/* @css */` et `/* @js */`
//! sont remplacés par le contenu de `web/css/*.css` et `web/js/*.js` (ordre alphabétique des noms de fichiers).
//! Utilisé par `build.rs` (l'interface est alors embarquée dans l'exécutable) et par le mode développeur.

use std::{fs, io, path::Path};

fn concat(dir: &Path, ext: &str) -> io::Result<String> {
    let mut files: Vec<_> = fs::read_dir(dir)?.filter_map(|e| e.ok()).map(|e| e.path()).filter(|p| p.extension().is_some_and(|x| x == ext)).collect();
    files.sort();
    let mut out = String::new();
    for f in files {
        out.push_str(&fs::read_to_string(f)?);
    }
    Ok(out)
}

pub fn assemble(web: &Path) -> io::Result<String> {
    let tpl = fs::read_to_string(web.join("index.html"))?;
    let (css, js) = (concat(&web.join("css"), "css")?, concat(&web.join("js"), "js")?);
    if tpl.matches("/* @css */").count() != 1 || tpl.matches("/* @js */").count() != 1 {
        return Err(io::Error::new(io::ErrorKind::InvalidData, "web/index.html doit contenir une fois /* @css */ et une fois /* @js */"));
    }
    Ok(tpl.replace("/* @css */", &css).replace("/* @js */", &js))
}

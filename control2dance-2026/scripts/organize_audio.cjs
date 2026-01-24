const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = path.join(__dirname, '../public/products.json');
const AUDIO_DIR = path.join(__dirname, '../public/audio');

function sanitizeFolderName(name) {
    return name
        .replace(/&#\d+;/g, '')
        .replace(/&amp;/g, '-')
        .replace(/[<>:"/\\|?*&]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
}

function sanitizeFilename(name) {
    return name
        .replace(/&#\d+;/g, '')
        .replace(/&amp;/g, '-')
        .replace(/[<>:"/\\|?*&]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .replace(/Demo-?$/i, '')
        .replace(/-$/g, '')
        .substring(0, 100);
}

function main() {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
    const updatedProducts = [];
    let movedCount = 0;
    let folderCount = 0;

    // Primero, recopilar todos los archivos existentes en audio/
    const existingFiles = new Map();
    const allItems = fs.readdirSync(AUDIO_DIR, { withFileTypes: true });

    for (const item of allItems) {
        if (item.isDirectory()) {
            // Buscar archivos en subcarpetas
            const subPath = path.join(AUDIO_DIR, item.name);
            const subFiles = fs.readdirSync(subPath);
            for (const file of subFiles) {
                if (file.endsWith('.mp3')) {
                    existingFiles.set(file, path.join(subPath, file));
                }
            }
        } else if (item.name.endsWith('.mp3')) {
            existingFiles.set(item.name, path.join(AUDIO_DIR, item.name));
        }
    }

    for (const product of products) {
        const folderName = sanitizeFolderName(`${product.catalogNumber}-${product.brand}-${product.name}`);
        const folderPath = path.join(AUDIO_DIR, folderName);

        const newAudioUrls = [];

        if (product.audioUrls && product.audioUrls.length > 0) {
            // Crear carpeta si no existe
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                folderCount++;
                console.log(`📁 Creada carpeta: ${folderName}`);
            }

            product.audioUrls.forEach((audioUrl, idx) => {
                const oldFilename = path.basename(audioUrl);

                // Buscar el archivo en cualquier ubicación
                let oldPath = existingFiles.get(oldFilename);

                if (!oldPath) {
                    // Intentar buscar directamente
                    const directPath = path.join(AUDIO_DIR, oldFilename);
                    if (fs.existsSync(directPath)) {
                        oldPath = directPath;
                    }
                }

                // Obtener nombre del track del array tracks o del nombre del archivo
                const trackName = product.tracks && product.tracks[idx]
                    ? sanitizeFilename(product.tracks[idx])
                    : sanitizeFilename(oldFilename.replace(/\.mp3$/i, ''));

                const trackNum = String(idx + 1).padStart(2, '0');
                const newFilename = `${trackNum}-${trackName}.mp3`;
                const newPath = path.join(folderPath, newFilename);
                const newUrl = `/audio/${folderName}/${newFilename}`;

                if (oldPath && fs.existsSync(oldPath)) {
                    try {
                        // Verificar que no estemos moviendo al mismo sitio
                        if (oldPath !== newPath) {
                            fs.renameSync(oldPath, newPath);
                            console.log(`  ✅ → ${newFilename}`);
                            movedCount++;
                        }
                        newAudioUrls.push(newUrl);
                    } catch (err) {
                        console.log(`  ❌ Error: ${err.message}`);
                        newAudioUrls.push(audioUrl);
                    }
                } else {
                    // Verificar si ya existe en destino
                    if (fs.existsSync(newPath)) {
                        newAudioUrls.push(newUrl);
                    } else {
                        console.log(`  ⚠️  No encontrado: ${oldFilename}`);
                        newAudioUrls.push(audioUrl);
                    }
                }
            });
        }

        updatedProducts.push({
            ...product,
            audioUrls: newAudioUrls
        });
    }

    // Guardar el products.json actualizado
    fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(updatedProducts, null, 2));

    console.log(`\n✨ Completado:`);
    console.log(`   📁 ${folderCount} carpetas creadas`);
    console.log(`   🎵 ${movedCount} archivos movidos`);
    console.log(`   📄 products.json actualizado`);
}

main();

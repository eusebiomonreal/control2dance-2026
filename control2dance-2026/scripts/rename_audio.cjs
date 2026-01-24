const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = path.join(__dirname, '../public/products.json');
const AUDIO_DIR = path.join(__dirname, '../public/audio');

function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100);
}

function main() {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
    const renames = [];
    const updatedProducts = [];

    for (const product of products) {
        const productName = sanitizeFilename(`${product.brand}-${product.name}`);
        const newAudioUrls = [];

        if (product.audioUrls && product.audioUrls.length > 0) {
            product.audioUrls.forEach((audioUrl, idx) => {
                const oldFilename = path.basename(audioUrl);
                const oldPath = path.join(AUDIO_DIR, oldFilename);

                // Extraer la cara del disco del nombre original si existe (A, A1, B, B1, etc.)
                const sideMatch = oldFilename.match(/[_-]([AB][AB]?[0-9]?)[_-]?Demo/i) ||
                                  oldFilename.match(/([AB][0-9]?)-Demo/i);
                const side = sideMatch ? `-${sideMatch[1].toUpperCase()}` : '';

                const trackNum = String(idx + 1).padStart(2, '0');
                const newFilename = `${productName}${side}-Track${trackNum}.mp3`;
                const newPath = path.join(AUDIO_DIR, newFilename);
                const newUrl = `/audio/${newFilename}`;

                if (fs.existsSync(oldPath)) {
                    if (oldPath !== newPath) {
                        renames.push({ old: oldPath, new: newPath, oldFilename, newFilename });
                    }
                    newAudioUrls.push(newUrl);
                } else {
                    console.log(`⚠️  Archivo no encontrado: ${oldFilename}`);
                    newAudioUrls.push(audioUrl); // Mantener URL original
                }
            });
        }

        updatedProducts.push({
            ...product,
            audioUrls: newAudioUrls
        });
    }

    // Mostrar los cambios que se harán
    console.log(`\n📁 Se renombrarán ${renames.length} archivos:\n`);

    // Ejecutar los renombrados
    let renamed = 0;
    let errors = 0;

    for (const rename of renames) {
        try {
            // Verificar que el destino no exista ya
            if (fs.existsSync(rename.new) && rename.old !== rename.new) {
                console.log(`⚠️  Destino ya existe, saltando: ${rename.newFilename}`);
                continue;
            }

            fs.renameSync(rename.old, rename.new);
            console.log(`✅ ${rename.oldFilename} → ${rename.newFilename}`);
            renamed++;
        } catch (err) {
            console.log(`❌ Error renombrando ${rename.oldFilename}: ${err.message}`);
            errors++;
        }
    }

    // Guardar el products.json actualizado
    fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(updatedProducts, null, 2));

    console.log(`\n✨ Completado: ${renamed} archivos renombrados, ${errors} errores`);
    console.log(`📄 products.json actualizado con las nuevas rutas`);
}

main();

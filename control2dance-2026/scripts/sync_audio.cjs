const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON = path.join(__dirname, '../public/products.json');
const AUDIO_DIR = path.join(__dirname, '../public/audio');

function sanitizeName(name) {
    return name
        .replace(/&#\d+;/g, '038')  // HTML entities -> 038
        .replace(/&amp;/g, '038')
        .replace(/&/g, '038')
        .replace(/[<>:"/\\|?*!()–]/g, '')  // Remove parentheses and special dashes
        .replace(/\./g, '')  // Remove dots (T.Comissi -> TComissi)
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}

function normalizeForMatch(name) {
    return name
        .replace(/[-_\s.()]/g, '')
        .replace(/038/g, '')
        .replace(/vol(\d)/gi, 'vol$1')
        .replace(/remix(es)?/gi, 'rmx')
        .toLowerCase();
}

function main() {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
    const updatedProducts = [];
    let updatedCount = 0;
    let matchedCount = 0;

    // Obtener todas las carpetas de audio
    const audioFolders = fs.readdirSync(AUDIO_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    for (const product of products) {
        // Generar posibles nombres de carpeta basados en brand y name
        const possibleNames = [
            `${product.brand}-${product.name}`,
            `${product.name}`,
            `${product.catalogNumber}-${product.brand}-${product.name}`,
        ].map(sanitizeName);

        // Buscar carpeta que coincida
        let matchedFolder = null;
        for (const folder of audioFolders) {
            const folderLower = folder.toLowerCase();
            const folderNorm = normalizeForMatch(folder);
            for (const possible of possibleNames) {
                const possibleNorm = normalizeForMatch(possible);
                if (folderLower === possible ||
                    folderLower.includes(possible) ||
                    possible.includes(folderLower) ||
                    folderNorm === possibleNorm ||
                    folderNorm.includes(possibleNorm) ||
                    possibleNorm.includes(folderNorm)) {
                    matchedFolder = folder;
                    break;
                }
            }
            if (matchedFolder) break;
        }

        if (matchedFolder) {
            const folderPath = path.join(AUDIO_DIR, matchedFolder);
            const audioFiles = fs.readdirSync(folderPath)
                .filter(f => f.endsWith('.mp3'))
                .sort();

            if (audioFiles.length > 0) {
                const newAudioUrls = audioFiles.map(f => `/audio/${matchedFolder}/${f}`);
                const newTracks = audioFiles.map(f => {
                    return f.replace(/^\d+-/, '').replace(/\.mp3$/i, '').replace(/-/g, ' ');
                });

                if (JSON.stringify(product.audioUrls) !== JSON.stringify(newAudioUrls)) {
                    console.log(`✅ ${product.catalogNumber}: ${audioFiles.length} tracks (${matchedFolder})`);
                    updatedCount++;
                }
                matchedCount++;

                updatedProducts.push({
                    ...product,
                    audioUrls: newAudioUrls,
                    tracks: newTracks
                });
            } else {
                console.log(`⚠️  ${product.catalogNumber}: carpeta vacía`);
                updatedProducts.push(product);
            }
        } else {
            console.log(`❌ ${product.catalogNumber} (${product.brand} - ${product.name}): sin carpeta`);
            updatedProducts.push(product);
        }
    }

    fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(updatedProducts, null, 2));

    console.log(`\n✨ Completado:`);
    console.log(`   📁 ${matchedCount} productos con audio`);
    console.log(`   ✏️  ${updatedCount} productos actualizados`);
}

main();

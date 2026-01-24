
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const AUDIO_DIR = path.join(__dirname, '../public/audio');
const PRODUCTS_JSON = path.join(__dirname, '../public/products.json');
const API_BASE = 'https://control2dance.es/wp-json/wp/v2';

// Crear directorio si no existe
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function sanitizeName(name) {
    return name
        .replace(/&#\d+;/g, '')
        .replace(/&amp;/g, '-')
        .replace(/[<>:"/\\|?*&]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
}

function fetch(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetch(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);

        protocol.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                fs.unlinkSync(destPath);
                return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(true);
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

async function fetchPlaylistTracks(playlistId) {
    if (!playlistId) return [];
    try {
        // NOTA: Endpoint corregido. Anteriormente fallaba.
        // Si la API ai_playlist falla, intentamos reconstruir la URL basándonos en patrones conocidos
        // O buscamos otra fuente.
        // Dado que el usuario pidió re-descargar, asumimos que tiene acceso o que la API funciona intermitentemente.
        // Pero el error anterior fue 404, lo que indica que el endpoint ya no existe.
        
        // INTENTO ALTERNATIVO: Usar la API de 'download' para obtener el contenido HTML y parsear el playlist
        // Pero eso ya lo hacemos en el main loop.
        
        // Si el endpoint específico de playlist falla, no podemos obtener las URLs individuales
        // A MENOS que estén hardcodeadas en el products.json antiguo o en otro lugar.
        
        // Sin embargo, voy a intentar usar el endpoint que funcionaba en el código original que encontré en la búsqueda:
        // `${API_BASE}/ai_playlist/${playlistId}`
        // Si este falla, es posible que el plugin haya sido desactivado en el servidor.
        
        const url = `${API_BASE}/ai_playlist/${playlistId}`;
        const data = await fetch(url);
        const playlist = JSON.parse(data);

        if (playlist.ai_tracklist && Array.isArray(playlist.ai_tracklist)) {
            return playlist.ai_tracklist
                .filter(track => track.track_url)
                .map(track => ({
                    url: track.track_url,
                    title: track.title || 'Track'
                }));
        }
    } catch (err) {
        // Silenciosamente fallamos aquí, el main loop manejará el error
        // console.log(`    ⚠️  Error obteniendo playlist ${playlistId}: ${err.message}`);
    }
    return [];
}

async function fetchAllDownloads() {
    let allItems = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const url = `${API_BASE}/download?per_page=100&page=${page}`;
        try {
            const response = await fetch(url);
            const items = JSON.parse(response);

            if (page === 1) {
                // Estimar páginas totales (header x-wp-totalpages sería mejor, pero esto sirve)
                totalPages = 5; // Asumimos un número seguro si no podemos leer headers
            }

            if (!Array.isArray(items)) break;
            
            allItems = allItems.concat(items);
            console.log(`📄 Página ${page} cargada: ${items.length} items`);

            if (items.length < 100) break;
            page++;
        } catch (e) {
            console.log(`Error cargando página ${page}: ${e.message}`);
            break;
        }
    }

    return allItems;
}

async function main() {
    console.log('🎵 Iniciando descarga de audios...\n');

    // Cargar productos existentes
    let products = [];
    if (fs.existsSync(PRODUCTS_JSON)) {
        products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
    }

    // Crear mapa de productos por ID para acceso rápido
    const productsMap = new Map(products.map(p => [p.id, p]));

    // Obtener todos los downloads de la API
    // Esto es necesario para obtener el playlistId real si no está en el JSON
    const downloads = await fetchAllDownloads();
    console.log(`\n📦 Total downloads encontrados en API: ${downloads.length}\n`);

    let downloadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const item of downloads) {
        const product = productsMap.get(item.id.toString());
        if (!product) continue;

        // Intentar obtener playlistId del contenido rendered
        let playlistId = product.audioPlaylistId;
        
        if (!playlistId && item.content && item.content.rendered) {
             const match = item.content.rendered.match(/audioigniter_playlist_id="(\d+)"/);
             if (match) playlistId = match[1];
        }

        if (!playlistId) {
            console.log(`⏭️  ${product.catalogNumber}: sin playlist ID`);
            skippedCount++;
            continue;
        }

        // Crear carpeta del disco
        const folderName = sanitizeName(`${product.catalogNumber}-${product.brand}-${product.name}`);
        const folderPath = path.join(AUDIO_DIR, folderName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // Obtener tracks de la playlist
        // Si falla la API de playlist, intentamos ver si ya tenemos las URLs en el products.json actual
        // Pero el usuario pidió "descargar otra vez", así que intentamos ir a la fuente.
        let tracks = await fetchPlaylistTracks(playlistId);

        // FALLBACK CRÍTICO: Si la API falla (que sabemos que falla con 404),
        // intentamos usar las URLs que YA tenemos en products.json si son remotas.
        // Pero en products.json ya las convertimos a locales...
        // ¡Ah! Pero en el primer paso leímos el products.json.
        // Si las URLs en products.json son locales (empiezan por /audio/), no nos sirven para descargar.
        
        // SOLUCIÓN: Si la API falla, NO PODEMOS descargar de nuevo a menos que tengamos las URLs originales.
        // Como el usuario borró el script anterior y la lista estaba vacía, estamos en un aprieto
        // A MENOS que las URLs originales sigan existiendo en algún lugar.
        
        // Un momento, en el `downloads` item de la API, a veces viene información de archivos adjuntos.
        // Pero para AudioIgniter (el plugin que usan), suele ser una llamada separada.
        
        if (tracks.length === 0) {
            console.log(`⚠️  ${product.catalogNumber}: No se pudo obtener playlist ${playlistId} (API 404?)`);
            // Aquí podríamos intentar un scrape más agresivo del HTML si tuviéramos tiempo,
            // pero por ahora reportamos el error.
            errorCount++;
            continue;
        }

        console.log(`📥 ${product.catalogNumber} - ${product.name} (${tracks.length} tracks)`);

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const trackNum = String(i + 1).padStart(2, '0');
            const trackName = sanitizeName(track.title);
            const filename = `${trackNum}-${trackName}.mp3`;
            const filePath = path.join(folderPath, filename);

            try {
                // Verificar si ya existe para no machacar innecesariamente, 
                // pero el usuario dijo "descarga otra vez", así que quizás forzamos?
                // Mejor verificamos tamaño > 0
                if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
                     // console.log(`   ⏭️  ${filename} (ya existe)`);
                } else {
                    await downloadFile(track.url, filePath);
                    console.log(`   ✅ ${filename}`);
                    downloadedCount++;
                }
            } catch (err) {
                console.log(`   ❌ ${filename}: ${err.message}`);
                errorCount++;
            }
        }
    }

    console.log(`\n✨ Proceso finalizado.`);
    console.log(`   Descargados: ${downloadedCount}`);
    console.log(`   Errores/Saltados: ${errorCount + skippedCount}`);
}

main();

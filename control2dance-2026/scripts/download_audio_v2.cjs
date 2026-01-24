const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PRODUCTS_FILE = path.join(__dirname, '../public/products.json');
const AUDIO_DIR = path.join(__dirname, '../public/audio');

// Helper para hacer fetch simple
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchUrl(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', (e) => reject(e));
        req.end();
    });
}

// Helper para descargar archivo
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
            // console.log(`   ⏩ Archivo ya existe, saltando: ${path.basename(destPath)}`);
            resolve(true);
            return;
        }

        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;
        
        const req = protocol.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(true));
                });
            } else if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirect
                file.close();
                fs.unlinkSync(destPath); // Delete partial file
                downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            } else {
                file.close();
                fs.unlinkSync(destPath); // Delete empty file
                reject(new Error(`Server responded with ${response.statusCode}: ${response.statusMessage}`));
            }
        });

        req.on('error', (err) => {
            file.close();
            // Delete the file if it was created
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            reject(err);
        });
    });
}

// Helper para sanitizar nombres de archivo/carpeta
function sanitizeName(name) {
    return name
        .replace(/[^a-z0-9\s-]/gi, '') // Eliminar caracteres especiales
        .trim()
        .replace(/\s+/g, '-'); // Reemplazar espacios con guiones
}

async function main() {
    console.log('🚀 Iniciando proceso de descarga y organización de audios...');

    // 1. Leer products.json
    if (!fs.existsSync(PRODUCTS_FILE)) {
        console.error('❌ No se encontró public/products.json');
        process.exit(1);
    }
    
    let products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    let totalDownloads = 0;
    let errors = 0;

    // Asegurar que existe la carpeta base de audio
    if (!fs.existsSync(AUDIO_DIR)) {
        fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }

    // 2. Iterar productos
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        if (!product.audioPlaylistId) {
            console.log(`⚠️ Producto "${product.name}" no tiene audioPlaylistId. Saltando.`);
            continue;
        }

        console.log(`\n🎧 Procesando producto: ${product.name} (Playlist ID: ${product.audioPlaylistId})`);

        try {
            // Fetch playlist info
            const playlistUrl = `https://control2dance.es/?audioigniter_playlist_id=${product.audioPlaylistId}`;
            const playlistData = await fetchUrl(playlistUrl);
            let tracks = [];
            
            try {
                tracks = JSON.parse(playlistData);
            } catch (e) {
                console.error(`❌ Error parseando JSON de playlist para ${product.name}`);
                continue;
            }

            if (!Array.isArray(tracks) || tracks.length === 0) {
                console.log(`⚠️ Playlist vacía para ${product.name}`);
                continue;
            }

            // Crear carpeta para el producto
            // Formato solicitado: "Artista - Disco"
            // Nota: products.json no tiene campo explícito "artist", pero "name" suele ser el disco y "brand" el artista/sello.
            // Analizando el JSON: "brand" suele ser el título del disco (ej: "Da Nu Style Vol 4") y "name" el track o subtítulo (ej: "Chris-Maxxx").
            // O a veces al revés.
            // En el ejemplo de "Da Nu Style Vol 4", brand="Da Nu Style Vol 4", name="Chris-Maxxx".
            // El usuario pide "Artista + Nombre del disco".
            // Muchos productos no tienen campo "artist".
            // Voy a usar una lógica híbrida: si el nombre empieza por el brand, usar brand.
            // O mejor: usar brand + name para asegurar unicidad y descriptividad, pero formateado limpio.
            // Si miramos el JSON, "brand" parece ser el "Album/Collection" y "name" el "Titulo Específico".
            // Intentaré inferir "Artista" si es posible, pero si no, usaré "Brand - Name".
            
            // CORRECCIÓN: El usuario pide "Artista + Nombre del disco".
            // Mirando products.json, no hay campo "artist".
            // Pero "brand" suele tener el nombre principal.
            
            let artist = sanitizeName(product.brand || 'Unknown'); 
            let album = sanitizeName(product.name || 'Unknown');

            // FIX: Casos especiales donde el nombre del producto contiene "Da Nu Style" (u otros similares)
            // y debería ser tratado como el Artista/Brand.
            // Ej: name="Da Nu Style Vol.2", brand="Control2Dance" -> Debería ser Folder: "Da-Nu-Style-Vol2-Control2Dance"
            if (product.name && product.name.toLowerCase().includes('da nu style')) {
                // Intercambiamos para que Da Nu Style quede como "Artista" (primera parte de la carpeta)
                const temp = artist;
                artist = sanitizeName(product.name);
                album = temp;
            }
            
            // A veces brand y name son casi iguales.
            let productFolderName;
            if (artist === album) {
                 productFolderName = artist;
            } else {
                 productFolderName = `${artist}-${album}`;
            }
            
            // Limpiar guiones duplicados
            productFolderName = productFolderName.replace(/-+/g, '-');

            const productDir = path.join(AUDIO_DIR, productFolderName);
            
            if (!fs.existsSync(productDir)) {
                fs.mkdirSync(productDir, { recursive: true });
            }

            const newAudioUrls = [];

            // Descargar cada track
            for (let j = 0; j < tracks.length; j++) {
                const track = tracks[j];
                const trackUrl = track.audio;
                
                if (!trackUrl) continue;

                // Generar nombre de archivo: "NombreDisco-NombreTema.mp3"
                // Usamos product.brand si existe (suele ser el nombre del disco), si no product.name
                const albumName = sanitizeName(product.brand || product.name);
                const trackName = sanitizeName(track.title || `Track-${j+1}`);
                
                // Evitar nombres duplicados o muy largos
                let fileName = `${albumName}-${trackName}.mp3`;
                
                // Si queremos mantener el orden, podríamos añadir el índice, pero el usuario pidió "Disco + Tema"
                // Para evitar colisiones si hay remixes con mismo nombre, añadimos índice si ya existe (o siempre para seguridad)
                // Vamos a añadir el índice al principio para garantizar orden y unicidad, aunque el usuario dijo "nombre disco + tema"
                // Una interpretación estricta sería SIN índice, pero eso es arriesgado.
                // Hagamos: "Disco-Tema.mp3". Si hay colisión, añadimos algo.
                // Pero espera, el sistema de archivos ordena alfabéticamente. Si quito el número, el orden se pierde.
                // Voy a asumir que el usuario quiere ver "Disco - Tema" en el nombre del archivo.
                // Voy a usar: "NombreDisco-NombreTema.mp3".
                
                // Check collision in this run (though unlikely in same playlist unless repeated tracks)
                // Better safe: Prefix with index? User didn't ask for it.
                // Let's stick to "Album-Track.mp3".
                
                fileName = `${albumName}-${trackName}.mp3`;
                
                const filePath = path.join(productDir, fileName);
                const publicPath = `/audio/${productFolderName}/${fileName}`;

                console.log(`   ⬇️ Descargando: ${fileName}...`);
                
                try {
                    await downloadFile(trackUrl, filePath);
                    newAudioUrls.push(publicPath);
                    totalDownloads++;
                } catch (err) {
                    console.error(`   ❌ Error descargando ${fileName}: ${err.message}`);
                    errors++;
                    // Mantener URL original o dejar vacío si falla? 
                    // Si falla, intentaremos usar la URL remota como fallback en el JSON?
                    // Mejor no romper el array, metemos la remota si falla la local.
                    newAudioUrls.push(trackUrl);
                }
            }

            // Actualizar el producto con las nuevas URLs locales
            if (newAudioUrls.length > 0) {
                product.audioUrls = newAudioUrls;
                // También actualizar la lista de nombres de tracks si es necesario, 
                // pero products.json ya tiene "tracks". Asumimos que coinciden en orden.
            }

        } catch (err) {
            console.error(`❌ Error procesando producto ${product.name}: ${err.message}`);
            errors++;
        }
    }

    // 3. Guardar products.json actualizado
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    console.log(`\n✨ Proceso finalizado.`);
    console.log(`📦 Total archivos descargados: ${totalDownloads}`);
    console.log(`⚠️ Errores: ${errors}`);
    console.log(`📝 products.json actualizado.`);
}

main();

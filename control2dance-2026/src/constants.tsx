
import type { Product } from './types';

// URL Maestra que sabemos que funciona perfectamente
const MASTER_BACKUP = 'https://control2dance.es/wp-content/uploads/edd/2026/01/unnamed-560x560.jpg';

/**
 * Proxy de imágenes optimizado.
 * Usa 'images.weserv.nl' con el parámetro 'default', lo que garantiza que si la imagen
 * específica falla (403/404), se devuelva la imagen maestra de la tienda en lugar de un error.
 */
const proxyImage = (url: string) => {
  const cleanUrl = url.replace('https://', '').replace('http://', '');
  const encodedMaster = encodeURIComponent(MASTER_BACKUP.replace('https://', ''));
  return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=600&h=600&fit=cover&output=webp&default=${encodedMaster}`;
};

// Lista de portadas optimizada. He añadido el sufijo -560x560 a las que daban error,
// ya que WordPress suele requerir el tamaño exacto para permitir el acceso externo.
const RAW_COVERS = [
  'https://control2dance.es/wp-content/uploads/edd/2026/01/unnamed-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Da-Nu-Style-Vol-4-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Da-Nu-Style-Vol-2-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Searching-4-Why-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/03/Scratch-Ep-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/No-More-Trouble-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Think-Love-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Without-You-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Passion-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Love-Me-Tonight-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Follow-Me-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Faith-Lix-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Get-Up-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Forza-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/No-Comment-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Fire-Alert-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Dream-X-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Shake-Your-Hands-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/Reach-The-Sky-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/The-Faktor-560x560.jpg',
  'https://control2dance.es/wp-content/uploads/2021/04/September-Forever-560x560.jpg'
];

export const PLACEHOLDER_COVER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMwYTBkMWYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmY0ZDdkIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIvPjxwYXRoIGQ9Ik0zMCA1MCBMNzAgNTAiIHN0cm9rZT0iI2ZmNGQ3ZCIgc3Ryb2tlLXdpZHRoPSIxIi8+PHBhdGggZD0iTTUwIDMwIEw1MCA3MCIgc3Ryb2tlPSIjZmY0ZDdkIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=';

const RAW_LIST = [
  "Da Nu Style Vol 4 - Chris-Maxxx", "Da Nu Style Vol.2", "Pack DJ RUBEN SANCHEZ", "DJ Cheno & SR Pely - Searching 4 why",
  "E.M.O - Children E.M.O. Remix 2002", "Dj Batiste - Nocker", "Hardhouse Corporation Vol.5 - San Francisco",
  "DJ MITO & TCOMISSI vol 3 - No hay dinero", "Ke Wapo!", "Dj Cheno - My Hero", "Bossma Volumen II - Killers",
  "Toni Atomic Feat Eloise Vol.2 - Think Love", "Coro Vs Atomic", "Dany Bpm - Without You",
  "Dj Temple Vs Dj Batiste - The Final Hardcore", "Dj Ruben - So Fast", "EmoDJ - You", "Emo Dj - Where is the light",
  "Toni Atomic Feat Eloise - Dance", "Dj Ruben - On my own", "Sr Pely & DJ Ekis - Passion", "2 Love Me Falling",
  "Urbano - Love Me Tonight", "Rednoise - Followme", "Cavern Sound Vol 2", "Zen Lab Vs Emo Dj - Faith-Lix",
  "E.M.O Dj & Soundcube - I Would Stay", "Dicarlo - Get Up!", "Da Nu Style Vol 1", "T.Comissi - Forza!!",
  "Scratch - Scratch Ep", "Dj David Max - No Comment!!", "Dj Beast-T Presents The Moon - B My I Desired",
  "Emo - Frecuenz X", "Dicarlo - Fire Alert", "Dj Batiste - Dream X", "R.D.B - No More Trouble",
  "Cavern Sound Vol 1 - N7", "T.Comissi - Ke Tal!", "Scratch Ep - Emo Dj - Dj Mito", "Da Nu Style Vol 6 - Pump Up The Volume",
  "Sr Pely - Kiss Me Baby", "Atomic Vs Emo - Split Hardcore", "Hardnoise - Hardnoise", "Dj Chekee - Go Now",
  "Dj Mito & Emo Dj - Catalonian Dream", "Toni Atomic Feat Eloise - Shake Your Hands", "Sr Pely - Reach The Sky",
  "Dj Batiste - The Faktor", "Skudero Nothing Compares 2 U", "Exodos - Science Of Dance",
  "Mc Rage With Digital Boy & Dj Bike - September Forever", "Manssion - My Pain", "Dj Ali - The Dead Of Soul",
  "Di Face - The Ultimate Hardcore Experience", "Bolo & Uri Vs Emodj - The Drunked Kids", "Dj Nicol Feat Larissa - Say Goodbye",
  "Dj Screamer Vs Lady Evil - Satanic", "T-Comissi - Cmon", "Cavern Sound Vol 3 - Sayonara", "Emo Vs Batiste - Five Mg",
  "Rednoise Would You Be There", "Toni Atomic Feat Eloise - Obsession", "Dicarlo - Three", "Dj Uri Vs Emodj - Basstard",
  "Dj Juan Ruiz - Secret Of Love", "Exotica - What Is Love", "Thx - Hey Culega", "The Hardjumpers 2 - The Power",
  "Di Face 2 - Jarko 4 Life", "Nanin - From Heaven", "The Intruders - Sampleminds", "Wizard - I Wanna B",
  "Hardhouse & Cia 2 - Toing", "Bumping Corporation Vol 2 - I Got You", "Planet One - Really", "Cavern Sound Vol 4",
  "Dj Mito (Revelation)", "Bolo & Uri Vs Emo Dj - Such A Bitch", "Victor Conca - Come Away", "Dany Bpm - Feeling Alive",
  "The Hardjumpers - My House Is Your House", "The Bassmakers - Everywhere", "Hardhouse Corporation Vol 2 - Ready",
  "Scratch Ep Vol 2- Emo Dj - Dj Mito", "Dynamic Beats - Ignition", "Check Out The Sound", "Dj Blas - Peace Of Mind",
  "T Comissi - Ekemeniche", "Suzzan - Secreto De Amor", "Emo Dj Presents Danu Style Vol.8 - Never Come Back",
  "Dj Churry & Dj Tito - I Dont Belive In You", "Sr Pely - Dont Forget Me", "Sofia Dj - Down With Love",
  "Diface Vol.3 - Dark Fury", "Suzzan - Secret Of Love (Remixes)", "Heat Of The Night (D10 Remix)", "Nanin - Around The World",
  "Emo Dj Vol 4 - The Power Of Control", "Hardhouse & Cia Vol.3 - Burn The Bass", "Dynamic Beats - Hooters & Goats",
  "The American Lovers - American Lovers", "Bumping Corporation Vol.4 - Bump Attack", "Two Angels - Never Give Up (Emo Dj Rmx)",
  "Dj Xanti Feat Nikka - Here I Stand", "Loar - Wherever", "Diyo - Ready To Fly", "Hardhouse Corporation 4 - Go & On",
  "Toni Atomic Feat Eloise Vol 5 - Take To Your Heart", "D10 Presents Carlos Bernal - I Dont Give Up", "Thorn Feat Suzi - Made In Heaven",
  "Emo Dj Presents Da Nu Style Vol.7 - Dont Coming Back", "Dj Piyuli - Break The Time", "Diface Feat Anubis - Waiting For The Night",
  "Chumi Dj Presents Edu Vol.4 - Time Of Passion", "Bumping Corporation 3 - Terebou Kipon", "Sr Pely Feat Suzzan - In Your Eyes",
  "Chumi Dj Presents Dj10 - The Way You Touch", "Atomic Vs Emo 2 - No More", "Nano Project - Angel Of The Moon", "Victor Lips - Go Time",
  "Agus - Move Your Body", "Rave Master", "T.Comissi - I Need You", "Hardhouse Corp Vol 3 - Potenzia", "Dj Ruben & Dj Manu - U & Me",
  "DNZ Allstars - Right around the world", "Emo DJ - The night", "Control 2 Traxx Vol.1 - Shake Your Body", "The Jumpstyle Lovers - Jumpstyle Lovers",
  "American Lovers Vol4 - Say Jump", "T.Comissi Feat Alexis - Time To Change", "Kaz - Do You Know", "Rucho Dj Vs Daviliko Dj - Under The Rain",
  "Diface Feat Kaz - Let Your Love", "The American Lovers - The Best", "Emo Dj Presents Urbano - Love Me Tonight Rmx 07", "Dj Rikar - Show Me The Way",
  "T.Comissi - Give Me", "D10 Presents Kaz - Falling", "Suzzan - I Want You", "Dj Xanti - You Live In Me", "The American Lovers - American Lovers 2",
  "Chumi Dj Presents Dj10 - Storm Of Love", "Nano Project - Rebirth", "Toni Atomic Feat Eloise – Sweet Sleep"
];

const processProduct = (item: string, idx: number): Product => {
  const parts = item.split(' - ');
  const brand = parts.length > 1 ? parts[0] : 'Control2Dance';
  const name = parts.length > 1 ? parts[1] : parts[0];
  const id = `master-${idx}`;
  
  // Asignamos una imagen de la lista. El proxy manejará el error si la imagen no existe.
  const rawImage = RAW_COVERS[idx % RAW_COVERS.length];
  const image = proxyImage(rawImage);
  
  return {
    id: id,
    name: name,
    brand: brand,
    price: 3.99,
    description: `Restauración digital de alta fidelidad. Archivo maestro extraído directamente del laboratorio de Eusebio Monreal. Audio procesado a 24-bit PCM.`,
    image: image,
    category: 'Vinyl',
    rating: 5.0,
    stock: 999,
    tracks: [`${name} (Original Mix)`, `${name} (Digital Remaster)`],
    audioUrls: [],
    youtubeUrls: [], 
    year: (1998 + (idx % 15)).toString(),
    label: 'Control2Dance Records',
    catalogNumber: `C2D-${200 + idx}`,
    released: (1998 + (idx % 15)).toString(),
    styles: ['Hard House', 'Bumping', 'Makina'],
    genre: 'Electronic'
  };
};

export const STATIC_PRODUCTS: Product[] = RAW_LIST.map((item, idx) => processProduct(item, idx));

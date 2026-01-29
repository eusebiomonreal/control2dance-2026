/**
 * API endpoint para obtener datos de un release de Discogs
 */
import type { APIRoute } from 'astro';

const DISCOGS_TOKEN = import.meta.env.DISCOGS_TOKEN || process.env.DISCOGS_TOKEN;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL requerida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extraer release ID de la URL
    const match = url.match(/release\/(\d+)/i);
    if (!match) {
      return new Response(JSON.stringify({ error: 'URL de Discogs inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const releaseId = match[1];

    // Fetch a Discogs API
    const response = await fetch(
      `https://api.discogs.com/releases/${releaseId}?token=${DISCOGS_TOKEN}`,
      {
        headers: {
          'User-Agent': 'Control2DanceAdmin/1.0'
        }
      }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Error de Discogs: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const release = await response.json();

    // Procesar datos
    const tracklist = release.tracklist
      ?.filter((t: any) => t.type_ === 'track')
      .map((t: any) => ({
        position: t.position || '',
        title: t.title || '',
        duration: t.duration || ''
      })) || [];

    const credits = release.extraartists?.map((a: any) => ({
      role: a.role || '',
      name: a.name || ''
    })) || [];

    const barcode = release.identifiers?.find((i: any) => i.type === 'Barcode')?.value || '';

    // Construir respuesta con datos relevantes
    // Seleccionar imagen primaria o la primera disponible
    let coverImage = '';
    if (release.images && release.images.length > 0) {
      const primary = release.images.find((img: any) => img.type === 'primary');
      coverImage = primary ? primary.uri : release.images[0].uri;
    }

    // Mapear videos para audio previews (YouTube)
    // ELIMINADO por solicitud del usuario: "no quiero videos de youtube"
    const videos: any[] = [];

    const data = {
      discogs_id: releaseId,
      discogs_url: `https://www.discogs.com/release/${releaseId}`,
      title: release.title || '',
      artists: release.artists?.map((a: any) => a.name).join(', ') || '',
      year: release.year?.toString() || '',
      label: release.labels?.[0]?.name || '',
      genre: release.genres?.[0] || '',
      styles: release.styles || [],
      country: release.country || '',
      format: release.formats?.[0]?.name || '',
      tracklist,
      credits,
      barcode,
      cover_image: coverImage,
      videos
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

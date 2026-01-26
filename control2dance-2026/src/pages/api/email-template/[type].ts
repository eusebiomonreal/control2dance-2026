import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';

export const prerender = false;

const TEMPLATES: Record<string, string> = {
  invite: 'invite.html',
  confirmation: 'confirmation.html',
  recovery: 'recovery.html',
  magic_link: 'magic_link.html',
  email_change: 'email_change.html'
};

export const GET: APIRoute = async ({ params, url }) => {
  const type = params.type;

  if (!type || !TEMPLATES[type]) {
    return new Response('Template not found', { status: 404 });
  }

  try {
    // Read template file
    const templatePath = join(process.cwd(), 'public', 'email-templates', TEMPLATES[type]);
    let html = readFileSync(templatePath, 'utf-8');

    // Get variables from query params (GoTrue sends these)
    const confirmationUrl = url.searchParams.get('confirmation_url') || url.searchParams.get('ConfirmationURL') || '{{ .ConfirmationURL }}';
    const siteUrl = url.searchParams.get('site_url') || url.searchParams.get('SiteURL') || 'https://dev.control2dance.es';
    const token = url.searchParams.get('token') || url.searchParams.get('Token') || '{{ .Token }}';

    // Replace variables
    html = html.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, confirmationUrl);
    html = html.replace(/\{\{\s*\.SiteURL\s*\}\}/g, siteUrl);
    html = html.replace(/\{\{\s*\.Token\s*\}\}/g, token);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error reading template:', error);
    return new Response('Error loading template', { status: 500 });
  }
};

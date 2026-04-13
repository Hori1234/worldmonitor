import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';

export const config = { runtime: 'edge' };

function isPrivateHost(hostname) {
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1|\[::1\])/i.test(hostname)) return true;
  if (/^(169\.254\.|100\.(6[4-9]|[7-9]\d|1[0-2]\d)\.)/.test(hostname)) return true;
  return false;
}

const STRIPPED_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'content-encoding',
  'content-length',
  'transfer-encoding',
]);

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (isDisallowedOrigin(req)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const rateLimitResponse = await checkRateLimit(req, corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  const targetUrl = new URL(req.url).searchParams.get('url');
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let parsed;
  try { parsed = new URL(targetUrl); } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return new Response(JSON.stringify({ error: 'Only HTTP(S) URLs allowed' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (isPrivateHost(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'Private addresses not allowed' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const responseHeaders = { ...corsHeaders };
    for (const [key, value] of upstream.headers.entries()) {
      if (STRIPPED_HEADERS.has(key.toLowerCase())) continue;
      if (key.toLowerCase().startsWith('access-control-')) continue;
      responseHeaders[key] = value;
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await upstream.text();
      // Inject <base> so relative URLs resolve against the original domain
      const baseTag = '<base href="' + parsed.origin + parsed.pathname.replace(/\/[^/]*$/, '/') + '">';
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/(<head[^>]*>)/i, '$1' + baseTag);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(/(<html[^>]*>)/i, '$1<head>' + baseTag + '</head>');
      } else {
        html = baseTag + html;
      }
      return new Response(html, { status: upstream.status, headers: responseHeaders });
    }

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (err) {
    const message = err.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch URL';
    return new Response(JSON.stringify({ error: message }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
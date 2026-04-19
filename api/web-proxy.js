import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { checkRateLimit } from './_rate-limit.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

// Source - https://stackoverflow.com/a/79445730
// Posted by GTK, License - CC BY-SA 4.0
// Adapted for edge runtime (no axios/cheerio/DOMParser)
async function getGoogleNewsUrl(rssUrl) {
    try {
        // 1. Fetch the initial RSS article page
        const { data: html } = await axios.get(rssUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
            }
        });

        // 2. Parse HTML to find the data-p attribute
        const $ = cheerio.load(html);
        const dataP = $('c-wiz[data-p]').attr('data-p');

        if (!dataP) {
            throw new Error("Could not find the required data-p attribute.");
        }

        // 3. Clean and parse the inner JSON object
        const cleanedData = dataP.replace('%.@.', '["garturlreq",');
        const obj = JSON.parse(cleanedData);

        // 4. Construct the BatchExecute payload
        // We slice the array similar to Python's obj[:-6] + obj[-2:]
        const processedObj = [...obj.slice(0, -6), ...obj.slice(-2)];
        
        const payload = new URLSearchParams();
        const innerReq = [['Fbv4je', JSON.stringify(processedObj), 'null', 'generic']];
        payload.append('f.req', JSON.stringify([innerReq]));

        // 5. POST to the BatchExecute endpoint
        const batchUrl = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
        const response = await axios.post(batchUrl, payload.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            }
        });

        // 6. Extract the final URL from the nested JSON response
        const rawText = response.data.replace(")]}'\n", "");
        const parsedBatch = JSON.parse(rawText);
        const arrayString = parsedBatch[0][2];
        const articleUrl = JSON.parse(arrayString)[1];

        return articleUrl;

    } catch (error) {
        console.error("Error decoding Google News URL:", error);
        return null;
    }
}

function isGoogleNewsArticle(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'news.google.com' && /\/(?:rss\/)?articles\//.test(u.pathname);
  } catch { return false; }
}

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

  let targetUrl = new URL(req.url).searchParams.get('url');
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  console.log('Received URL to proxy:', targetUrl);
  // Resolve Google News redirect URLs to actual article URLs
  if (isGoogleNewsArticle(targetUrl)) {
    try {
      const resolved = await getGoogleNewsUrl(targetUrl)
      console.log('Resolved Google News URL:', resolved);
      if (resolved) targetUrl = resolved;
    } catch { /* continue with original URL */ }
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
      let baseParsed = parsed;
      if (upstream.url) {
        try { baseParsed = new URL(upstream.url); } catch { /* keep original */ }
      }
      const baseTag = '<base href="' + baseParsed.origin + baseParsed.pathname.replace(/\/[^/]*$/, '/') + '">';
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
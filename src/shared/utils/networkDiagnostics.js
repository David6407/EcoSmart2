import { supabaseConfig } from '../../infrastructure/supabase/client';

function getHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return 'URL invalida';
  }
}

async function checkUrl(label, url, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers,
      signal: controller.signal,
    });

    return `${label}: HTTP ${response.status}`;
  } catch (error) {
    return `${label}: ${error.name || 'Error'} ${error.message || ''}`.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLoginNetworkDiagnostics() {
  const checks = [
    checkUrl('Internet', 'https://example.com'),
  ];

  if (supabaseConfig.url && supabaseConfig.hasKey) {
    const supabaseHost = getHost(supabaseConfig.url);
    checks.push(
      checkUrl(`Supabase auth ${supabaseHost}`, `${supabaseConfig.url}/auth/v1/health`, {
        headers: {
          apikey: supabaseConfig.key,
        },
      }),
      checkUrl(`Supabase rest ${supabaseHost}`, `${supabaseConfig.url}/rest/v1/`, {
        headers: {
          apikey: supabaseConfig.key,
        },
      })
    );
  } else {
    checks.push(Promise.resolve('Supabase: variables incompletas'));
  }

  const results = await Promise.all(checks);
  return results.join(' | ');
}

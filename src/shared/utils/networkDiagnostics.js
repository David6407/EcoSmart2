import { supabaseConfig } from '../../infrastructure/supabase/client';

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

  if (supabaseConfig.url && supabaseConfig.hasAnonKey) {
    checks.push(
      checkUrl('Supabase', `${supabaseConfig.url}/auth/v1/health`, {
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        },
      })
    );
  } else {
    checks.push(Promise.resolve('Supabase: variables incompletas'));
  }

  const results = await Promise.all(checks);
  return results.join(' | ');
}

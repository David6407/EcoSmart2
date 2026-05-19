import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 80;

type NotificationEvent = {
  id: string;
  recipient_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  attempts: number;
};

type PushToken = {
  expo_push_token: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase environment variables.' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: events, error: eventsError } = await supabase
    .from('notification_events')
    .select('id, recipient_id, title, body, data, attempts')
    .eq('status', 'pending')
    .lte('available_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (eventsError) {
    return jsonResponse({ error: eventsError.message }, 500);
  }

  const pendingEvents = (events || []) as NotificationEvent[];
  if (pendingEvents.length === 0) {
    return jsonResponse({ sent: 0, skipped: 0 });
  }

  let sent = 0;
  let skipped = 0;

  for (const event of pendingEvents) {
    const { data: tokens, error: tokensError } = await supabase
      .from('notification_push_tokens')
      .select('expo_push_token')
      .eq('user_id', event.recipient_id)
      .eq('enabled', true);

    if (tokensError) {
      await supabase
        .from('notification_events')
        .update({
          attempts: event.attempts + 1,
          last_error: tokensError.message,
        })
        .eq('id', event.id);
      continue;
    }

    const expoTokens = ((tokens || []) as PushToken[])
      .map((token) => token.expo_push_token)
      .filter((token) => token?.startsWith('ExponentPushToken[') || token?.startsWith('ExpoPushToken['));

    if (expoTokens.length === 0) {
      skipped += 1;
      await supabase
        .from('notification_events')
        .update({
          status: 'skipped',
          attempts: event.attempts + 1,
          last_error: 'No enabled Expo push tokens for recipient.',
        })
        .eq('id', event.id);
      continue;
    }

    try {
      for (const tokenBatch of chunk(expoTokens, 100)) {
        const messages = tokenBatch.map((to) => ({
          to,
          title: event.title,
          body: event.body,
          data: event.data || {},
          sound: 'default',
          channelId: 'default',
        }));

        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'accept-encoding': 'gzip, deflate',
            'content-type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          throw new Error(`Expo push API responded ${response.status}: ${await response.text()}`);
        }
      }

      sent += 1;
      await supabase
        .from('notification_events')
        .update({
          status: 'sent',
          attempts: event.attempts + 1,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', event.id);
    } catch (error) {
      await supabase
        .from('notification_events')
        .update({
          attempts: event.attempts + 1,
          last_error: error instanceof Error ? error.message : 'Unknown push error.',
          available_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .eq('id', event.id);
    }
  }

  return jsonResponse({ sent, skipped, total: pendingEvents.length });
});

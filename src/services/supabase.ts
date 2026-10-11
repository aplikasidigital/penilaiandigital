import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// Supabase Connection Credentials (Updated with official credentials)
// Note: When URL includes '/rest/v1/', strip it to get the standard Supabase Project Origin
const rawUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://qixphlsusrcquqncnbma.supabase.co/rest/v1/';
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHBobHN1c3JjcXVxbmNuYm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTYzMzksImV4cCI6MjEwNzEzMjMzOX0.ICBw1GUTFuI0vm0fVuB1nw0WofVy49V3wL5fGAmNmFg';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ywK7tqaqHBrwStA72uN96w_j2M6nwfB';

// Service Role Key: Digunakan khusus untuk operasi server-side / admin backend dengan bypass RLS
export const SUPABASE_SERVICE_ROLE_KEY =
  import.meta.env?.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHBobHN1c3JjcXVxbmNuYm1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTU1NjMzOSwiZXhwIjoyMTA3MTMyMzM5fQ.L1RPMzs8u5TzZ4eEDn_ek_iWFTYcbL6ld1YHD57Zkgg';

export const SUPABASE_SECRET_KEY =
  import.meta.env?.SUPABASE_SECRET_KEY ||
  'sb_secret_y-ngLEl0sccUohOZTHIW5g_7ppmauWs';

/**
 * 1. Client-Side Supabase Client (Public & Anon)
 * Digunakan untuk operasi publik di browser, autentikasi voter/juri, dan Realtime Subscriptions
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 30, // Sangat cepat: 30 events per detik untuk sinkronisasi tanpa jeda
    },
  },
});

/**
 * Server-Side / Admin Client Factory
 * Gunakan hanya jika dijalankan di Node.js / backend route yang aman
 */
export const getSupabaseAdmin = (): SupabaseClient => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

/**
 * 2. Supabase Real-Time Broadcast & Subscription Service (Zero-Latency Feel)
 * Menyediakan kanal sinkronisasi live real-time antar perangkat dan jendela browser
 */
const CHANNEL_NAME = 'simpel_digital_realtime_v1';
let realtimeChannel: RealtimeChannel | null = null;
const listeners = new Set<(event: string, payload?: any) => void>();
let isChannelSubscribed = false;
const pendingBroadcasts: Array<{ type: string; data?: any }> = [];

// Helper untuk mengeksekusi listener tanpa blocking dan mencegah duplicate events
let lastEventSignature = '';
let lastEventTimestamp = 0;

// Session ID unik untuk browser/tab ini guna mencegah self-echo yang memicu re-render saat pengguna mengetik
export const CLIENT_SESSION_ID = typeof window !== 'undefined' 
  ? ((window as any).__SIMPEL_CLIENT_ID || ((window as any).__SIMPEL_CLIENT_ID = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now())) 
  : 'server_instance';

const dispatchToListeners = (type: string, payload?: any) => {
  const sig = `${type}_${payload?.table || ''}_${payload?.eventType || ''}_${payload?.new?.id || payload?.old?.id || payload?.id || ''}_${payload?.timestamp || ''}`;
  const now = Date.now();
  if (sig === lastEventSignature && now - lastEventTimestamp < 60) {
    return; // Cegah pemanggilan ganda dalam interval 60ms
  }
  lastEventSignature = sig;
  lastEventTimestamp = now;

  listeners.forEach((callback) => {
    try {
      callback(type, payload);
    } catch (err) {
      console.warn('[Supabase Realtime] Listener error:', err);
    }
  });
};

export const initSupabaseRealtime = (): RealtimeChannel => {
  if (realtimeChannel && isChannelSubscribed) {
    return realtimeChannel;
  }

  // Jika channel lama bermasalah, bersihkan sebelum inisialisasi baru
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel).catch(() => {});
    realtimeChannel = null;
  }

  try {
    realtimeChannel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: {
          ack: false, // Low-latency fire-and-forget sub-second sync (<50ms)
          self: false, // Jangan kirim kembali ke jendela/tab pengirim
        },
      },
    });

    // A. Dengarkan Realtime Broadcast antar browser/device untuk 'zero-latency feel'
    realtimeChannel.on('broadcast', { event: 'data_changed' }, (payload) => {
      // Cegah self-echo: jika event ini dikirim oleh tab/klien ini sendiri, abaikan agar tidak memicu re-render saat mengetik
      if (payload?.payload?.senderId === CLIENT_SESSION_ID) {
        return;
      }
      const type = payload?.payload?.type || 'remote_update';
      dispatchToListeners(type, payload?.payload);
    });

    // B. Dengarkan Postgres CDC (Change Data Capture) secara spesifik per tabel utama
    const tables = [
      'submissions',
      'peserta',
      'mata_lomba',
      'users',
      'event_config',
      'voting_categories',
      'topup_requests',
      'vote_records',
    ];

    tables.forEach((tableName) => {
      realtimeChannel?.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          dispatchToListeners(`postgres_${payload.table}_${payload.eventType}`, payload);
        }
      );
    });

    // Subscribe ke kanal dengan auto-flush antrean saat tersambung
    realtimeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribed = true;
        // Langsung kirim antrean broadcast yang sempat tertahan saat handshake
        while (pendingBroadcasts.length > 0) {
          const item = pendingBroadcasts.shift();
          if (item && realtimeChannel) {
            realtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: {
                type: item.type,
                data: item.data,
                senderId: CLIENT_SESSION_ID,
                timestamp: Date.now(),
              },
            }).catch(() => {});
          }
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isChannelSubscribed = false;
      }
    });

    return realtimeChannel;
  } catch (err) {
    console.warn('[Supabase Realtime] Failed to initialize channel:', err);
    return null as unknown as RealtimeChannel;
  }
};

/**
 * Mengirimkan sinyal pembaruan data secara Real-Time ke semua klien / perangkat lain
 */
export const broadcastRealtimeChange = async (type: string, data?: any): Promise<void> => {
  try {
    if (!realtimeChannel) {
      initSupabaseRealtime();
    }
    if (realtimeChannel) {
      if (isChannelSubscribed) {
        await realtimeChannel.send({
          type: 'broadcast',
          event: 'data_changed',
          payload: {
            type,
            data,
            senderId: CLIENT_SESSION_ID,
            timestamp: Date.now(),
          },
        });
      } else {
        // Antrekan agar terkirim segera setelah websocket terhubung
        pendingBroadcasts.push({ type, data });
      }
    }
  } catch (err) {
    console.warn('[Supabase Realtime] Send broadcast failed:', err);
  }
};

/**
 * Mendaftarkan callback untuk menerima event perubahan data secara live dari Supabase
 * Mengembalikan fungsi unsubscribe pembersih untuk mencegah memory leak / duplicate listener
 */
export const subscribeToRealtimeChanges = (callback: (type: string, payload?: any) => void): (() => void) => {
  listeners.add(callback);
  if (!realtimeChannel) {
    initSupabaseRealtime();
  }

  return () => {
    listeners.delete(callback);
  };
};

/**
 * Fungsi pembersihan total kanal realtime (untuk mencegah memory leak)
 */
export const cleanupSupabaseRealtime = async (): Promise<void> => {
  if (realtimeChannel) {
    try {
      await supabase.removeChannel(realtimeChannel);
    } catch {}
    realtimeChannel = null;
    isChannelSubscribed = false;
    listeners.clear();
  }
};

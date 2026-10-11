import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client menggunakan kredensial resmi
const supabaseUrl = 'https://qixphlsusrcquqncnbma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeHBobHN1c3JjcXVxbmNuYm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NTYzMzksImV4cCI6MjEwNzEzMjMzOX0.ICBw1GUTFuI0vm0fVuB1nw0WofVy49V3wL5fGAmNmFg';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AutoSaveEditor({ recordId = 'default-user-id' }) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Saved'); // Status: 'Saved', 'Saving...', 'Error'
  const [loading, setLoading] = useState(true);

  // 1. Fetch Data awal saat komponen dimuat
  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', recordId)
        .single();

      if (data) {
        setContent(data.content || '');
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching data:', error.message);
      }
      setLoading(false);
    }

    fetchInitialData();

    // 2. Setup Supabase Realtime Subscription (Mendengar perubahan dari database/client lain)
    const channel = supabase
      .channel('app_settings_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Mendengar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'app_settings',
          filter: `user_id=eq.${recordId}`,
        },
        (payload) => {
          if (payload.new && payload.new.content !== content) {
            // Update state lokal secara instan jika ada perubahan dari luar/server
            setContent(payload.new.content);
            setStatus('Saved');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordId]);

  // Fungsi untuk menyimpan data ke Supabase dengan teknik UPSERT
  const saveDataToSupabase = async (valueToSave) => {
    setStatus('Saving...');
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { 
          user_id: recordId, 
          content: valueToSave, 
          updated_at: new Date() 
        },
        { onConflict: 'user_id' } // Mencegah duplikasi baris, data di-update jika user_id sama
      );

    if (error) {
      console.error('Save error:', error.message);
      setStatus('Error saving');
    } else {
      setStatus('Saved');
    }
  };

  // 3. Debounce Auto-Save menggunakan useRef & setTimeout (Delay 800ms)
  const debounceTimerRef = useRef(null);

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    
    // Optimistic UI: Update state lokal seketika tanpa jeda loading
    setContent(newValue);
    setStatus('Saving...');

    // Hapus timer sebelumnya agar jeda dihitung ulang dari ketikan terakhir
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set timer baru (800ms) sebelum melakukan request API ke Supabase
    debounceTimerRef.current = setTimeout(() => {
      saveDataToSupabase(newValue);
    }, 800);
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Memuat data dari database...</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-md rounded-lg mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Editor Dokumen / Pengaturan (Auto-Save)</h2>
        {/* Indikator Status */}
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          status === 'Saved' ? 'bg-green-100 text-green-700' :
          status === 'Saving...' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {status}
        </span>
      </div>

      <textarea
        value={content}
        onChange={handleTextChange}
        rows={6}
        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        placeholder="Ketik sesuatu di sini... Data akan tersimpan otomatis."
      />
      
      <p className="text-xs text-gray-400 mt-2">
        Perubahan akan disinkronkan secara real-time dan aman tanpa tombol simpan manual.
      </p>
    </div>
  );
}

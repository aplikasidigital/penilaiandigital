-- ==============================================================================
-- SKEMA DATABASE LENGKAP: APLIKASI PENILAIAN LOMBA DIGITAL (S-IMPEL DIGITAL)
-- Proyek: aplikasilomba (ID: qixphlsusrcquqncnbma)
-- Jalankan skrip ini langsung di menu "SQL Editor" pada Dashboard Supabase Anda.
-- ==============================================================================

-- 1. TABEL: event_config (Pengaturan Informasi Acara, BGM, dan Rekening DANA)
CREATE TABLE IF NOT EXISTS public.event_config (
    "id" TEXT PRIMARY KEY DEFAULT 'default_config',
    "judulKegiatan" TEXT DEFAULT 'APLIKASI PENILAIAN LOMBA DIGITAL',
    "subJudul" TEXT DEFAULT 'S-IMPEL DIGITAL: Sistem Penilaian Digital Terintegrasi & Voting Berbayar',
    "deskripsi" TEXT DEFAULT 'Ajang bergengsi kejuaraan dengan transparansi penilaian dewan juri secara real-time dan voting berbayar.',
    "tempat" TEXT DEFAULT 'Jawa Barat',
    "tanggalWaktu" TEXT DEFAULT 'Hari, Tanggal Bulan Tahun | 08:00 WIB s.d Selesai',
    "penyelenggara" TEXT DEFAULT 'S-IMPEL DIGITAL',
    "logoUrl" TEXT DEFAULT '',
    "backgroundUrl" TEXT DEFAULT '',
    "backgroundColor" TEXT DEFAULT '#fefce8',
    "primaryColor" TEXT DEFAULT '#b45309',
    "secondaryColor" TEXT DEFAULT '#b91c1c',
    "videoTeaserUrl" TEXT DEFAULT '',
    "bgmAudioUrl" TEXT DEFAULT '',
    "bgmEnabled" BOOLEAN DEFAULT true,
    "bgmVolume" NUMERIC DEFAULT 0.35,
    "peraturanLomba" JSONB DEFAULT '[]'::jsonb,
    "nomorDanaAdmin" TEXT DEFAULT '081314420312',
    "namaAkunDana" TEXT DEFAULT 'S-IMPEL DIGITAL (081314420312)',
    "qrisImageUrl" TEXT DEFAULT '',
    "votingClosed" BOOLEAN DEFAULT false,
    "danaTransferDisabled" BOOLEAN DEFAULT false,
    "autoApproveWebhookEnabled" BOOLEAN DEFAULT false,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: users (Akun Super Admin, Shadow Admin, Dewan Juri, dan Voter)
CREATE TABLE IF NOT EXISTS public.users (
    "id" TEXT PRIMARY KEY,
    "username" TEXT UNIQUE NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL, -- 'super_admin' | 'shadow_admin' | 'juri' | 'voter' | 'publik'
    "phone" TEXT,
    "avatarUrl" TEXT DEFAULT '',
    "assignedMataLombaIds" JSONB DEFAULT '[]'::jsonb,
    "voteBalance" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: mata_lomba (Cabang Mata Lomba & Kriteria Penilaian)
CREATE TABLE IF NOT EXISTS public.mata_lomba (
    "id" TEXT PRIMARY KEY,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT,
    "deskripsi" TEXT,
    "lokasi" TEXT,
    "jadwal" TEXT,
    "durasiMaksimalMenit" INTEGER DEFAULT 10,
    "durasiTargetDetik" INTEGER DEFAULT 420,
    "kriteriaList" JSONB DEFAULT '[]'::jsonb,
    "assignedJuriIds" JSONB DEFAULT '[]'::jsonb,
    "icon" TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL: peserta (Daftar Peserta Perlombaan)
CREATE TABLE IF NOT EXISTS public.peserta (
    "id" TEXT PRIMARY KEY,
    "nomorUrut" INTEGER NOT NULL,
    "nomorDada" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "asalInstansi" TEXT,
    "mataLombaId" TEXT,
    "kategori" TEXT DEFAULT '',
    "kontak" TEXT DEFAULT '',
    "fotoUrl" TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL: submissions (Lembar Nilai, Stopwatch, Pelanggaran & Tanda Tangan Juri)
CREATE TABLE IF NOT EXISTS public.submissions (
    "id" TEXT PRIMARY KEY,
    "mataLombaId" TEXT NOT NULL,
    "pesertaId" TEXT NOT NULL,
    "juriId" TEXT NOT NULL,
    "juriNama" TEXT NOT NULL,
    "waktuPengerjaanDetik" INTEGER DEFAULT 0,
    "nilaiKriteria" JSONB DEFAULT '[]'::jsonb,
    "pelanggaranList" JSONB DEFAULT '[]'::jsonb,
    "totalPengurangan" NUMERIC DEFAULT 0,
    "totalNilai" NUMERIC DEFAULT 0,
    "catatanJuri" TEXT DEFAULT '',
    "tandaTanganUrl" TEXT DEFAULT '',
    "paktaIntegritasDisetujui" BOOLEAN DEFAULT true,
    "status" TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    "adminNotes" TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "approvedAt" TIMESTAMPTZ,
    "approvedBy" TEXT
);

-- 6. TABEL: voting_categories (Kategori Voting Berbayar)
CREATE TABLE IF NOT EXISTS public.voting_categories (
    "id" TEXT PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT DEFAULT '',
    "hargaPerVote" NUMERIC DEFAULT 5000,
    "mataLombaId" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL: topup_requests (Pengajuan Topup Saldo Vote via QRIS DANA)
CREATE TABLE IF NOT EXISTS public.topup_requests (
    "id" TEXT PRIMARY KEY,
    "voterId" TEXT NOT NULL,
    "voterNama" TEXT NOT NULL,
    "jumlahVote" INTEGER DEFAULT 1,
    "hargaTotal" NUMERIC DEFAULT 5000,
    "metode" TEXT DEFAULT 'DANA_QRIS',
    "nomorDanaTujuan" TEXT DEFAULT '081314420312',
    "buktiTransferUrl" TEXT DEFAULT '',
    "pengirimNama" TEXT NOT NULL,
    "pengirimNomorHp" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    "catatanAdmin" TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "approvedAt" TIMESTAMPTZ
);

-- 8. TABEL: vote_records (Rekam Jejak Transaksi Vote Masuk)
CREATE TABLE IF NOT EXISTS public.vote_records (
    "id" TEXT PRIMARY KEY,
    "votingCategoryId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "pesertaId" TEXT NOT NULL,
    "jumlahVote" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PENGATURAN ROW LEVEL SECURITY (RLS) & POLICY AKSES LENGKAP (CRUD)
-- Mengizinkan aplikasi membaca & menyimpan data menggunakan Anon/Public Key
-- ==============================================================================

ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_lomba ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_records ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('event_config', 'users', 'mata_lomba', 'peserta', 'submissions', 'voting_categories', 'topup_requests', 'vote_records')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon full access" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow anon full access" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow authenticated full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- AKTIFKAN REPLICA IDENTITY FULL PADA SETIAP TABEL
-- Agar Supabase Realtime CDC mengirimkan data baris lengkap saat UPDATE & DELETE
-- ==============================================================================
ALTER TABLE public.event_config REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.mata_lomba REPLICA IDENTITY FULL;
ALTER TABLE public.peserta REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;
ALTER TABLE public.voting_categories REPLICA IDENTITY FULL;
ALTER TABLE public.topup_requests REPLICA IDENTITY FULL;
ALTER TABLE public.vote_records REPLICA IDENTITY FULL;

-- ==============================================================================
-- AKTIFKAN FITUR REALTIME PADA SUPABASE REPLICATION
-- Agar perubahan data langsung tersiar secara live ke semua layar/dashboard
-- (Aman dijalankan berulang kali tanpa error duplikasi)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['event_config', 'users', 'mata_lomba', 'peserta', 'submissions', 'voting_categories', 'topup_requests', 'vote_records'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
    END LOOP;
END $$;

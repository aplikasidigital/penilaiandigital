import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Award,
  Vote,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Users,
  Search,
  ExternalLink,
  Info,
  Medal,
  Timer,
  AlertCircle,
  TrendingUp,
  Flame,
  Volume2
} from 'lucide-react';
import { EventConfig, MataLomba, Peserta, RankingParticipant } from '../types';
import { StorageService } from '../services/storage';

interface PublicLandingProps {
  eventConfig: EventConfig;
  onOpenLogin: () => void;
  onOpenVotingModal: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  eventConfig,
  onOpenLogin,
  onOpenVotingModal,
}) => {
  const [dataVersion, setDataVersion] = useState(0);

  // Sinkronisasi otomatis data secara Real-Time detik itu juga dari Supabase CDC & Broadcast
  useEffect(() => {
    const unsub = StorageService.onRemoteChange(() => {
      setDataVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Memoize data berat dari localStorage agar pengetikan di kolom pencarian tidak memicu JSON parse berulang
  const mataLombaList = useMemo(() => StorageService.getMataLomba(), [dataVersion]);
  const votingCategories = useMemo(() => StorageService.getVotingCategories(), [dataVersion]);
  const allPeserta = useMemo(() => StorageService.getPeserta(), [dataVersion]);

  const [activeTab, setActiveTab] = useState<'livescore' | 'voting' | 'informasi' | 'peraturan'>('livescore');
  const [selectedMataLombaId, setSelectedMataLombaId] = useState<string>(mataLombaList[0]?.id || '');
  const [selectedVotingCatId, setSelectedVotingCatId] = useState<string>(votingCategories[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const currentMl = useMemo(() => {
    return mataLombaList.find(m => m.id === selectedMataLombaId) || mataLombaList[0];
  }, [mataLombaList, selectedMataLombaId]);

  const rankings = useMemo(() => {
    return currentMl ? StorageService.calculateRanking(currentMl.id) : [];
  }, [currentMl, dataVersion]);

  const filteredRankings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rankings;
    return rankings.filter(
      r =>
        r.peserta.nama.toLowerCase().includes(q) ||
        r.peserta.asalInstansi.toLowerCase().includes(q) ||
        r.peserta.nomorDada.toLowerCase().includes(q)
    );
  }, [rankings, searchQuery]);

  // Voting calculation
  const voteCounts = StorageService.getVoteCounts(selectedVotingCatId);
  const totalVotesCast = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  // Sort participants by votes descending
  const currentCat = votingCategories.find(c => c.id === selectedVotingCatId) || votingCategories[0];
  const eligiblePeserta = currentCat?.mataLombaId
    ? allPeserta.filter(p => p.mataLombaId === currentCat.mataLombaId || (Array.isArray(p.mataLombaIds) && currentCat.mataLombaId && p.mataLombaIds.includes(currentCat.mataLombaId)))
    : allPeserta;

  const sortedVotedParticipants = [...eligiblePeserta].map(p => ({
    peserta: p,
    votes: voteCounts[p.id] || 0,
    percentage: totalVotesCast > 0 ? (((voteCounts[p.id] || 0) / totalVotesCast) * 100).toFixed(1) : '0',
  })).sort((a, b) => b.votes - a.votes);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="min-h-screen bg-stone-950/85 backdrop-blur-[2px] text-stone-100 flex flex-col">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-950/90 via-amber-950/50 to-stone-900/80 border-b border-amber-600/30 py-12 sm:py-16 px-4">
        {/* Decorative background glow & pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-4">
          {eventConfig.logoUrl && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-stone-950 p-1 mb-2 transform hover:scale-105 transition-transform">
              <img src={eventConfig.logoUrl} alt="Logo Resmi Kegiatan" className="w-full h-full object-cover rounded-xl" />
            </div>
          )}

          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-red-500/20 to-blue-500/20 border border-amber-400/40 rounded-full px-4 py-1.5 text-xs text-amber-300 font-semibold shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>PORTAL RESMI S-IMPEL DIGITAL • LIVE SCORE & VOTING REAL-TIME</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-100 font-display tracking-tight drop-shadow-md">
            {eventConfig.judulKegiatan}
          </h1>

          <p className="text-sm sm:text-base text-amber-100/90 max-w-3xl mx-auto font-medium leading-relaxed">
            {eventConfig.subJudul}
          </p>

          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mx-auto leading-relaxed">
            {eventConfig.deskripsi}
          </p>

          {/* Event Quick Info Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-stone-300">
            <div className="flex items-center gap-1.5 bg-stone-900/80 border border-stone-800 rounded-xl px-3.5 py-2 shadow">
              <MapPin className="w-4 h-4 text-red-400" />
              <span>{eventConfig.tempat}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-900/80 border border-stone-800 rounded-xl px-3.5 py-2 shadow">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{eventConfig.tanggalWaktu}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-900/80 border border-stone-800 rounded-xl px-3.5 py-2 shadow">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Penyelenggara: {eventConfig.penyelenggara}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setActiveTab('livescore')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg cursor-pointer transition-all"
            >
              <Trophy className="w-4 h-4" />
              Lihat Live Score Penilaian
            </button>
            <button
              onClick={() => setActiveTab('voting')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg cursor-pointer transition-all"
            >
              <Flame className="w-4 h-4" />
              Papan Skor Voting Terfavorit
            </button>
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs sm:text-sm cursor-pointer transition-all"
            >
              Masuk Akun (Admin / Juri / Voter)
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Navigation Tabs */}
      <section className="bg-stone-950/80 sticky top-0 z-30 border-b border-stone-800 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center overflow-x-auto">
          <div className="flex space-x-1 sm:space-x-3 py-2 text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab('livescore')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === 'livescore'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Live Score Penilaian
            </button>

            <button
              onClick={() => setActiveTab('voting')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === 'voting'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Vote className="w-4 h-4 text-red-400" />
              Papan Skor Voting
            </button>

            <button
              onClick={() => setActiveTab('peraturan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === 'peraturan'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Peraturan Lomba
            </button>

            <button
              onClick={() => setActiveTab('informasi')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === 'informasi'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Info className="w-4 h-4 text-emerald-400" />
              Jadwal & Lokasi
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-amber-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>LIVE SYNC AKTIF</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: LIVE SCORE PENILAIAN */}
        {activeTab === 'livescore' && (
          <div className="space-y-6">
            {/* Category Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
              <div className="w-full sm:w-auto flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                <span className="text-xs text-stone-400 font-semibold flex-shrink-0">Mata Lomba:</span>
                {mataLombaList.map(ml => (
                  <button
                    key={ml.id}
                    onClick={() => setSelectedMataLombaId(ml.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedMataLombaId === ml.id
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {ml.nama}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari peserta / instansi..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Current Mata Lomba Overview Card */}
            {currentMl && (
              <div className="bg-stone-950 border border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-1">
                    <span>KODE: {currentMl.kode}</span>
                    <span>•</span>
                    <span>KATEGORI: {currentMl.kategori}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white font-display">
                    {currentMl.nama}
                  </h2>
                  <p className="text-xs text-stone-400 mt-1 max-w-2xl">
                    {currentMl.deskripsi}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
                  <div>
                    <span className="text-stone-400 block text-[10px]">Target Waktu Lomba:</span>
                    <strong className="text-amber-300 font-mono">{formatSeconds(currentMl.durasiTargetDetik)}</strong>
                  </div>
                  <div className="h-6 w-px bg-stone-800" />
                  <div>
                    <span className="text-stone-400 block text-[10px]">Dewan Juri Terdaftar:</span>
                    <strong className="text-stone-200">{currentMl.assignedJuriIds.length} Juri</strong>
                  </div>
                </div>
              </div>
            )}

            {/* PODIUM TOP 3 HIGHLIGHT */}
            {filteredRankings.length >= 3 && !searchQuery && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Juara 2 (Perak) */}
                <div className="bg-stone-950/80 border border-stone-700 rounded-2xl p-4 text-center order-2 md:order-1 flex flex-col justify-between shadow-md">
                  <div>
                    <div className="w-12 h-12 bg-slate-300/20 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-400/40">
                      <Medal className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      JUARA 2 (PERAK)
                    </div>
                    <h3 className="font-bold text-base text-white mt-1">
                      {filteredRankings[1].peserta.nama}
                    </h3>
                    <p className="text-xs text-stone-400">{filteredRankings[1].peserta.asalInstansi}</p>
                    <div className="text-[11px] font-mono text-stone-500 mt-1">
                      No Dada: {filteredRankings[1].peserta.nomorDada}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Nilai Total Gabungan:</span>
                      <strong className="text-lg font-mono text-slate-200">
                        {filteredRankings[1].totalNilaiGabungan !== undefined && filteredRankings[1].totalNilaiGabungan > 0
                          ? filteredRankings[1].totalNilaiGabungan
                          : filteredRankings[1].rataRataNilai.toFixed(2)}
                      </strong>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Rata-rata: {filteredRankings[1].rataRataNilai.toFixed(2)} ({filteredRankings[1].jumlahJuriMenilai} Juri)
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Waktu:</span>
                      <span className="font-mono text-stone-300">{formatSeconds(filteredRankings[1].rataRataWaktuDetik)}</span>
                    </div>
                  </div>
                </div>

                {/* Juara 1 (Emas) - Center and Elevated */}
                <div className="bg-gradient-to-b from-amber-950/90 to-stone-950 border-2 border-amber-400 rounded-2xl p-5 text-center order-1 md:order-2 flex flex-col justify-between shadow-2xl relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow">
                    Peringkat 1
                  </div>
                  <div>
                    <div className="w-14 h-14 bg-amber-400/20 text-amber-300 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-400/60 shadow-inner">
                      <Trophy className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="text-xs font-extrabold text-amber-300 uppercase tracking-widest">
                      JUARA 1 (EMAS)
                    </div>
                    <h3 className="font-bold text-lg text-white mt-1 font-display">
                      {filteredRankings[0].peserta.nama}
                    </h3>
                    <p className="text-xs text-amber-200/80">{filteredRankings[0].peserta.asalInstansi}</p>
                    <div className="text-[11px] font-mono text-amber-400 mt-1">
                      No Dada: {filteredRankings[0].peserta.nomorDada}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-900/60 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-amber-200/70 block text-[10px]">Nilai Total Gabungan:</span>
                      <strong className="text-2xl font-mono text-amber-300 font-extrabold">
                        {filteredRankings[0].totalNilaiGabungan !== undefined && filteredRankings[0].totalNilaiGabungan > 0
                          ? filteredRankings[0].totalNilaiGabungan
                          : filteredRankings[0].rataRataNilai.toFixed(2)}
                      </strong>
                      <span className="text-[10px] text-amber-200/70 block mt-0.5">
                        Rata-rata: {filteredRankings[0].rataRataNilai.toFixed(2)} ({filteredRankings[0].jumlahJuriMenilai} Juri)
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-200/70 block text-[10px]">Waktu:</span>
                      <span className="font-mono text-stone-200">{formatSeconds(filteredRankings[0].rataRataWaktuDetik)}</span>
                    </div>
                  </div>
                </div>

                {/* Juara 3 (Perunggu) */}
                <div className="bg-stone-950/80 border border-stone-700 rounded-2xl p-4 text-center order-3 flex flex-col justify-between shadow-md">
                  <div>
                    <div className="w-12 h-12 bg-amber-800/20 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-700/40">
                      <Medal className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                      JUARA 3 (PERUNGGU)
                    </div>
                    <h3 className="font-bold text-base text-white mt-1">
                      {filteredRankings[2].peserta.nama}
                    </h3>
                    <p className="text-xs text-stone-400">{filteredRankings[2].peserta.asalInstansi}</p>
                    <div className="text-[11px] font-mono text-stone-500 mt-1">
                      No Dada: {filteredRankings[2].peserta.nomorDada}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Nilai Total Gabungan:</span>
                      <strong className="text-lg font-mono text-amber-500">
                        {filteredRankings[2].totalNilaiGabungan !== undefined && filteredRankings[2].totalNilaiGabungan > 0
                          ? filteredRankings[2].totalNilaiGabungan
                          : filteredRankings[2].rataRataNilai.toFixed(2)}
                      </strong>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        Rata-rata: {filteredRankings[2].rataRataNilai.toFixed(2)} ({filteredRankings[2].jumlahJuriMenilai} Juri)
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Waktu:</span>
                      <span className="font-mono text-stone-300">{formatSeconds(filteredRankings[2].rataRataWaktuDetik)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FULL LIVE SCORE TABLE */}
            <div className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 bg-stone-900 border-b border-stone-800 flex justify-between items-center">
                <h3 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Papan Klasemen Resmi Seluruh Peserta (Hasil Akhir & Rekapan Multi-Juri)
                </h3>
                <span className="text-xs text-stone-400">
                  Total Peserta: {filteredRankings.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900/90 text-stone-300 uppercase text-[11px] border-b border-stone-800">
                    <tr>
                      <th className="p-3.5 text-center w-12">Rank</th>
                      <th className="p-3.5 text-center w-20">No Dada</th>
                      <th className="p-3.5">Nama Peserta</th>
                      <th className="p-3.5">Asal Instansi</th>
                      <th className="p-3.5 text-center">Waktu Pengerjaan</th>
                      <th className="p-3.5 text-center">Juri Dinilai</th>
                      <th className="p-3.5 text-center text-amber-300 font-bold">Nilai Total Gabungan</th>
                      <th className="p-3.5 text-center">Rata-Rata</th>
                      <th className="p-3.5 text-center">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {filteredRankings.map((item, idx) => (
                      <tr
                        key={item.peserta.id}
                        className={`transition-colors hover:bg-stone-900/50 ${
                          item.rank === 1
                            ? 'bg-amber-950/20'
                            : item.rank <= 3
                            ? 'bg-stone-900/30'
                            : ''
                        }`}
                      >
                        <td className="p-3.5 text-center font-bold">
                          {item.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold">1</span>
                          ) : item.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-stone-950 font-bold">2</span>
                          ) : item.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-bold">3</span>
                          ) : (
                            <span className="text-stone-400">{item.rank}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-amber-400">
                          {item.peserta.nomorDada}
                        </td>
                        <td className="p-3.5 font-bold text-white">
                          {item.peserta.nama}
                        </td>
                        <td className="p-3.5 text-stone-300">
                          {item.peserta.asalInstansi}
                        </td>
                        <td className="p-3.5 text-center font-mono text-stone-300">
                          {item.rataRataWaktuDetik > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Timer className="w-3 h-3 text-amber-400" />
                              {formatSeconds(item.rataRataWaktuDetik)}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center text-stone-400 font-mono">
                          {item.jumlahJuriMenilai} / {currentMl.assignedJuriIds.length || item.jumlahJuriMenilai || 1} Juri
                        </td>
                        <td className="p-3.5 text-center font-mono font-extrabold text-sm text-amber-300">
                          {item.totalNilaiGabungan !== undefined && item.totalNilaiGabungan > 0
                            ? item.totalNilaiGabungan
                            : item.rataRataNilai > 0
                            ? item.rataRataNilai
                            : '-'}
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs text-stone-300">
                          {item.rataRataNilai > 0 ? item.rataRataNilai.toFixed(2) : '-'}
                        </td>
                        <td className="p-3.5 text-center">
                          {item.predikatJuara ? (
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              item.rank === 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : item.rank === 2
                                ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                                : item.rank === 3
                                ? 'bg-amber-800/20 text-amber-500 border border-amber-700/40'
                                : item.rank <= 6
                                ? 'bg-blue-900/30 text-blue-300 border border-blue-600/30'
                                : 'bg-stone-800 text-stone-400'
                            }`}>
                              {item.predikatJuara}
                            </span>
                          ) : (
                            <span className="text-stone-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredRankings.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-stone-500">
                          Belum ada data peserta atau skor terverifikasi untuk kategori ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tie breaker rule note footer */}
              <div className="p-3 bg-stone-900/60 border-t border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Aturan Tie-Breaker:</strong> Peringkat dihitung dari Rata-Rata Nilai Tertinggi yang telah disetujui Admin. Jika terdapat nilai yang persis sama, peserta dengan <strong>Waktu Pengerjaan Tercepat</strong> otomatis menempati posisi lebih tinggi.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAPAN SKOR VOTING TERFAVORIT */}
        {activeTab === 'voting' && (
          <div className="space-y-6">
            {/* Voting Closed Banner if toggled by Super Admin */}
            {eventConfig.votingClosed && (
              <div className="p-4 bg-red-950/80 border-2 border-red-500 rounded-2xl flex items-center justify-between gap-4 text-red-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Penutupan Voting Resmi</h4>
                    <p className="text-xs text-red-300/80">
                      Sesi voting telah ditutup oleh Panitia Pelaksana. Seluruh data perolehan suara di bawah ini merupakan hasil akhir sah.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Voting Category Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <span className="text-xs text-stone-400 font-semibold flex-shrink-0">Kategori Vote:</span>
                {votingCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedVotingCatId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedVotingCatId === cat.id
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {cat.nama}
                  </button>
                ))}
              </div>

              {!eventConfig.votingClosed && (
                <button
                  onClick={onOpenVotingModal}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-lg cursor-pointer transition-all"
                >
                  <Flame className="w-4 h-4" />
                  Beli Vote via DANA QRIS (081314420312)
                </button>
              )}
            </div>

            {/* Category Banner */}
            <div className="bg-gradient-to-r from-red-950/80 via-stone-950 to-amber-950/80 border border-red-500/30 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                  KATEGORI VOTING PEMIRSA
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {currentCat?.nama || 'Juara Terfavorit Pemirsa'}
                </h2>
                <p className="text-xs text-stone-300 mt-1 max-w-xl">
                  {currentCat?.deskripsi}
                </p>
              </div>

              <div className="bg-stone-900/90 border border-stone-800 p-3.5 rounded-xl text-center min-w-[140px]">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Total Suara Masuk:</span>
                <span className="text-2xl font-mono font-extrabold text-amber-400">{totalVotesCast.toLocaleString('id-ID')}</span>
                <span className="text-[10px] text-stone-400 block mt-0.5">Voucher Sah</span>
              </div>
            </div>

            {/* Participants Voting Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedVotedParticipants.map((item, idx) => (
                <div
                  key={item.peserta.id}
                  className={`bg-stone-950 border rounded-2xl p-4 shadow-lg transition-all hover:border-amber-500/50 ${
                    idx === 0
                      ? 'border-amber-400/60 ring-1 ring-amber-500/30'
                      : 'border-stone-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                        idx === 0
                          ? 'bg-amber-500 text-stone-950'
                          : idx === 1
                          ? 'bg-slate-300 text-stone-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-800 text-stone-400'
                      }`}>
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="text-[11px] font-mono text-amber-400 font-bold">
                          {item.peserta.nomorDada}
                        </div>
                        <h4 className="font-bold text-sm text-white">
                          {item.peserta.nama}
                        </h4>
                        <p className="text-xs text-stone-400">
                          {item.peserta.asalInstansi}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-extrabold text-amber-300">
                        {item.votes.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-stone-400">Suara ({item.percentage}%)</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-500 to-amber-500'
                        }`}
                        style={{ width: `${Math.max(3, parseFloat(item.percentage))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PERATURAN LOMBA */}
        {activeTab === 'peraturan' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="border-b border-stone-800 pb-4">
              <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                PETUNJUK TEKNIS RESMI
              </div>
              <h2 className="text-2xl font-bold text-white font-display">
                Peraturan & Tata Tertib Perlombaan
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Seluruh peserta, official, dan dewan juri wajib menaati ketentuan hukum dan etika kompetisi berikut:
              </p>
            </div>

            <div className="space-y-4">
              {(eventConfig.peraturanLomba || []).map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 bg-stone-900/60 p-4 rounded-xl border border-stone-800"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-stone-200 leading-relaxed">
                    {rule}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: JADWAL & LOKASI KEGIATAN */}
        {activeTab === 'informasi' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="border-b border-stone-800 pb-4 mb-6">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  AGENDA KEGIATAN
                </span>
                <h2 className="text-2xl font-bold text-white font-display">
                  Jadwal Perlombaan & Denah Arena
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-amber-300 uppercase tracking-wide">
                    Rangkaian Waktu & Lokasi Per Mata Lomba
                  </h3>
                  {mataLombaList.map(ml => (
                    <div key={ml.id} className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-white">{ml.nama}</h4>
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                          {ml.kode}
                        </span>
                      </div>
                      <div className="text-xs text-stone-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-red-400" />
                          <span>{ml.lokasi}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{ml.jadwal} (Maks {ml.durasiMaksimalMenit} Menit)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-amber-300 uppercase tracking-wide">
                    Pusat Informasi & Bantuan
                  </h3>
                  <div className="bg-stone-900/80 border border-stone-800 p-5 rounded-xl space-y-3 text-xs text-stone-300 leading-relaxed">
                    <p>
                      Untuk pertanyaan teknis, kendala transfer DANA QRIS, atau penukaran kartu nomor peserta, silakan hubungi meja registrasi panitia pusat di lokasi utama.
                    </p>
                    <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 space-y-1 font-mono text-amber-300">
                      <div>Hotline Resmi / DANA: {eventConfig.nomorDanaAdmin || '081314420312'}</div>
                      <div>Email Panitia: panitia@simpel-digital.org</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-stone-950 border-t border-stone-900 py-8 px-4 text-center text-xs text-stone-500 space-y-2">
        <p className="text-stone-400 font-medium">
          © 2026 S-IMPEL DIGITAL • Sistem Penilaian Digital & Voting Berbayar Terpadu.
        </p>
        <p className="text-[11px] text-stone-600">
          Semua hak cipta dilindungi undang-undang. Penilaian real-time dengan verifikasi tanda tangan digital & tie-breaker stopwatch resmi.
        </p>
      </footer>
    </div>
  );
};

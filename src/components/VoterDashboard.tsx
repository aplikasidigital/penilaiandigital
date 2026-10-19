import React, { useState, useEffect, useMemo } from 'react';
import {
  Vote,
  CreditCard,
  History,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Sparkles,
  User as UserIcon,
  ShieldCheck,
  Clock,
  Eye,
  FileText,
  Download,
  ExternalLink,
  X
} from 'lucide-react';
import { EventConfig, Peserta, TopupRequest, User, VoteRecord, VotingCategory } from '../types';
import { StorageService } from '../services/storage';
import { DanaPaymentModal } from './DanaPaymentModal';
import { soundService } from '../services/sound';

interface VoterDashboardProps {
  currentUser: User;
  eventConfig: EventConfig;
  onLogout: () => void;
}

export const VoterDashboard: React.FC<VoterDashboardProps> = ({
  currentUser,
  eventConfig,
  onLogout,
}) => {
  const [isDanaModalOpen, setIsDanaModalOpen] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [selectedPesertaId, setSelectedPesertaId] = useState<string>('');
  const [jumlahVote, setJumlahVote] = useState<number>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchPeserta, setSearchPeserta] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  // Sinkronisasi otomatis data secara Real-Time detik itu juga dari Supabase CDC & Broadcast
  useEffect(() => {
    const unsub = StorageService.onRemoteChange(() => {
      setDataVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Memoize data berat dari localStorage agar pengetikan di kolom pencarian peserta tidak memicu JSON parse berulang
  const votingCategories = useMemo(() => StorageService.getVotingCategories(), [dataVersion]);
  const [selectedCatId, setSelectedCatId] = useState<string>(votingCategories[0]?.id || '');

  const allPeserta = useMemo(() => StorageService.getPeserta(), [dataVersion]);
  const allMataLomba = useMemo(() => StorageService.getMataLomba(), [dataVersion]);
  const allVoteRecords = useMemo(() => StorageService.getVoteRecords(), [dataVersion]);
  const allTopupRequests = useMemo(() => StorageService.getTopupRequests(), [dataVersion]);

  // Fresh user from storage to get updated vote balance
  const activeUser = useMemo(() => StorageService.getUserById(currentUser.id) || currentUser, [currentUser, dataVersion]);
  const currentBalance = activeUser.voteBalance || 0;

  // Filter records belonging to this user
  const userVoteRecords = useMemo(() => allVoteRecords.filter(r => r.voterId === currentUser.id), [allVoteRecords, currentUser.id]);
  const userTopups = useMemo(() => allTopupRequests.filter(r => r.voterId === currentUser.id), [allTopupRequests, currentUser.id]);

  const currentCategory = useMemo(() => votingCategories.find(c => c.id === selectedCatId) || votingCategories[0], [votingCategories, selectedCatId]);
  const eligiblePeserta = useMemo(() => {
    return currentCategory?.mataLombaId
      ? allPeserta.filter(p => p.mataLombaId === currentCategory.mataLombaId || (Array.isArray(p.mataLombaIds) && currentCategory.mataLombaId && p.mataLombaIds.includes(currentCategory.mataLombaId)))
      : allPeserta;
  }, [currentCategory, allPeserta]);

  const filteredPeserta = useMemo(() => {
    const q = searchPeserta.toLowerCase().trim();
    if (!q) return eligiblePeserta;
    return eligiblePeserta.filter(
      p =>
        p.nama.toLowerCase().includes(q) ||
        p.asalInstansi.toLowerCase().includes(q) ||
        p.nomorDada.toLowerCase().includes(q)
    );
  }, [eligiblePeserta, searchPeserta]);

  const handleCastVote = () => {
    setFeedbackMsg(null);
    if (!selectedPesertaId) {
      setFeedbackMsg({ type: 'error', text: 'Pilih peserta lomba yang ingin Anda berikan suara vote.' });
      return;
    }
    if (jumlahVote <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Jumlah vote minimal 1 suara.' });
      return;
    }
    if (currentBalance < jumlahVote) {
      setFeedbackMsg({
        type: 'error',
        text: `Saldo vote Anda tidak cukup (${currentBalance} suara). Silakan beli suara vote melalui DANA QRIS terlebih dahulu.`,
      });
      return;
    }

    soundService.playVoteCoin();
    const result = StorageService.castVote(selectedCatId, currentUser.id, selectedPesertaId, jumlahVote);

    if (result.success) {
      setFeedbackMsg({ type: 'success', text: result.message });
      setJumlahVote(1);
      soundService.playSuccessFanfare();
    } else {
      setFeedbackMsg({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-stone-950 border-b border-red-600/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-stone-100 font-display">
                PORTAL VOTING PEMIRSA
              </h1>
              <span className="bg-red-950 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-600/40 uppercase">
                Voter Resmi
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Pengguna: <strong className="text-stone-200">{currentUser.name}</strong> ({currentUser.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Strict restriction: NO upload/export/print menu visible here */}
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Keluar Akun
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Toggle warnings */}
        {eventConfig.votingClosed && (
          <div className="p-4 bg-red-950/80 border-2 border-red-500 rounded-2xl flex items-center gap-3 text-red-200">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Sesi Voting Telah Ditutup Panitia</h4>
              <p className="text-xs text-red-300/80">
                Pemberian suara telah dinonaktifkan secara resmi. Anda tidak dapat melakukan vote baru saat ini.
              </p>
            </div>
          </div>
        )}

        {/* Saldo & Top Up Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Saldo Vote */}
          <div className="bg-gradient-to-br from-stone-950 via-amber-950/50 to-stone-950 border border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                SALDO TIKET VOTE ANDA
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-white">
                  {currentBalance}
                </span>
                <span className="text-sm font-semibold text-amber-200">Suara Tersedia</span>
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Gunakan saldo suara untuk memilih peserta favorit Anda di bawah.
              </p>
            </div>

            <div className="pt-4 border-t border-amber-900/40 mt-4">
              <button
                onClick={() => setIsDanaModalOpen(true)}
                disabled={eventConfig.danaTransferDisabled}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {eventConfig.danaTransferDisabled ? 'Transfer DANA Dijeda' : 'Beli Suara via DANA QRIS'}
              </button>
            </div>
          </div>

          {/* Card 2: Akun DANA & Kode QRIS Panitia */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  METODE PEMBAYARAN RESMI
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-2 py-0.5 rounded-full font-bold">
                  QRIS Siap Scan
                </span>
              </div>
              <h3 className="font-bold text-base text-white">QRIS DANA Terintegrasi</h3>

              {/* QRIS Image Display on Voting / Purchasing page */}
              <div className="mt-2.5 bg-white p-2.5 rounded-xl border-2 border-amber-400 text-center shadow">
                {eventConfig.qrisImageUrl ? (
                  <div className="space-y-1">
                    <img
                      src={eventConfig.qrisImageUrl}
                      alt="QRIS DANA Pembelian Suara"
                      className="w-36 h-36 object-contain mx-auto rounded shadow-sm border border-stone-200 bg-white"
                    />
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Scan QRIS Resmi Panitia</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 text-stone-800">
                    <div className="w-28 h-28 mx-auto bg-stone-100 rounded-lg flex flex-col items-center justify-center border border-dashed border-stone-300">
                      <CreditCard className="w-8 h-8 text-amber-600 mb-1" />
                      <span className="text-[9px] font-bold text-stone-600">Barcode DANA</span>
                    </div>
                    <span className="text-[10px] text-stone-600 block mt-1">Nomor DANA Resmi</span>
                  </div>
                )}
              </div>

              <div className="mt-2.5 bg-stone-900 p-2.5 rounded-xl border border-stone-800">
                <div className="text-[10px] text-stone-400">Nomor Akun Tujuan DANA:</div>
                <div className="text-sm font-mono font-bold text-amber-300">
                  {eventConfig.nomorDanaAdmin || '081314420312'}
                </div>
                <div className="text-[10px] text-stone-500">
                  a.n. {eventConfig.namaAkunDana || 'S-IMPEL DIGITAL'}
                </div>
              </div>
            </div>
            <div className="mt-2.5">
              <button
                onClick={() => setIsDanaModalOpen(true)}
                className="w-full py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg text-xs font-semibold cursor-pointer border border-stone-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Buka Detail & Scan Penuh</span>
              </button>
            </div>
          </div>

          {/* Card 3: Statistik Suara Saya */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                AKTIVITAS SAYA
              </span>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Total Suara Diberikan:</span>
                  <strong className="text-white font-mono">
                    {userVoteRecords.reduce((acc, r) => acc + r.jumlahVote, 0)} Suara
                  </strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Pengajuan Top-Up:</span>
                  <strong className="text-white font-mono">{userTopups.length} Kali</strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Top-Up Berhasil:</span>
                  <strong className="text-emerald-400 font-mono">
                    {userTopups.filter(t => t.status === 'approved').length} Disetujui
                  </strong>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-amber-400/90 font-medium mt-3">
              ✓ Data diperbarui secara real-time
            </div>
          </div>
        </div>

        {/* Voting Action Section */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-red-500" />
                Formulir Pencoblosan / Dukung Peserta Lomba
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pilih kategori voting dan alokasikan tiket suara Anda ke peserta jagoan.
              </p>
            </div>

            {/* Voting Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-semibold">Kategori:</span>
              <select
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value)}
                className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-500"
              >
                {votingCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/80 border-red-500/50 text-red-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Search participant */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama peserta atau nomor dada..."
              value={searchPeserta}
              onChange={e => setSearchPeserta(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-red-500"
            />
          </div>

          {/* Participant Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredPeserta.map(pst => {
              const isSelected = selectedPesertaId === pst.id;
              const pMlIds = (pst.mataLombaIds && pst.mataLombaIds.length > 0)
                ? pst.mataLombaIds
                : (pst.mataLombaId ? [pst.mataLombaId] : []);
              const matchedMls = allMataLomba.filter(m => pMlIds.includes(m.id));
              const mlDisplay = matchedMls.map(m => m.nama).join(', ') || '-';

              return (
                <div
                  key={pst.id}
                  onClick={() => setSelectedPesertaId(pst.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-red-950/40 border-red-500 shadow-md ring-2 ring-red-500/40 text-white'
                      : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-stone-950 px-2 py-0.5 rounded">
                      {pst.nomorDada}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate max-w-[130px]" title={mlDisplay}>
                      {mlDisplay}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white mt-2">{pst.nama}</h4>
                  <p className="text-xs text-stone-400 mt-0.5 truncate">{pst.asalInstansi}</p>

                  <div className="mt-3 pt-2 border-t border-stone-800/80 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-stone-400">Status Pilihan:</span>
                    <strong className={isSelected ? 'text-red-400' : 'text-stone-500'}>
                      {isSelected ? '✓ Terpilih' : 'Klik Pilih'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cast Vote Action Bar */}
          <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-stone-300 font-semibold">
                Alokasi Jumlah Suara:
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10].map(qty => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setJumlahVote(qty)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                      jumlahVote === qty
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {qty}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max={currentBalance || 1}
                  value={jumlahVote}
                  onChange={e => setJumlahVote(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 bg-stone-950 border border-stone-700 rounded-lg text-xs text-center font-mono text-white outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCastVote}
              disabled={eventConfig.votingClosed || !selectedPesertaId || currentBalance < jumlahVote}
              className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl text-xs shadow-lg cursor-pointer transition-all disabled:opacity-40"
            >
              Kirim {jumlahVote} Suara Vote Sekarang
            </button>
          </div>
        </div>

        {/* Riwayat Vote & Riwayat Top-Up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Riwayat Vote */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat Penggunaan Vote Saya
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {userVoteRecords.map(vr => {
                const pst = allPeserta.find(p => p.id === vr.pesertaId);
                return (
                  <div key={vr.id} className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{pst?.nama || 'Peserta'}</div>
                      <div className="text-[10px] text-stone-400">{vr.createdAt ? new Date(vr.createdAt).toLocaleString('id-ID') : '-'}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-amber-400">
                      +{vr.jumlahVote} Suara
                    </div>
                  </div>
                );
              })}
              {userVoteRecords.length === 0 && (
                <div className="p-4 text-center text-xs text-stone-500">
                  Belum ada riwayat suara yang diberikan.
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Top-up DANA */}
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Riwayat Pembelian Saldo DANA
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {userTopups.map(tp => (
                <div key={tp.id} className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">{tp.jumlahVote} Suara (Rp {tp.hargaTotal.toLocaleString('id-ID')})</div>
                    <div className="text-[10px] text-stone-400">Pengirim: {tp.pengirimNama}</div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {tp.buktiTransferUrl && (
                      <button
                        type="button"
                        onClick={() => setViewingProofUrl(tp.buktiTransferUrl)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded text-[10px] font-semibold cursor-pointer border border-stone-700 hover:border-amber-500/50 transition-colors"
                        title="Klik untuk melihat bukti transfer yang di-upload"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Bukti</span>
                      </button>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tp.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                        : tp.status === 'rejected'
                        ? 'bg-red-950 text-red-300 border border-red-600/40'
                        : 'bg-amber-950 text-amber-300 border border-amber-600/40'
                    }`}>
                      {tp.status === 'approved' ? 'Disetujui' : tp.status === 'rejected' ? 'Ditolak' : 'Pending Admin'}
                    </span>
                  </div>
                </div>
              ))}
              {userTopups.length === 0 && (
                <div className="p-4 text-center text-xs text-stone-500">
                  Belum ada transaksi top-up DANA.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* DANA Payment Modal */}
      <DanaPaymentModal
        currentUser={currentUser}
        eventConfig={eventConfig}
        isOpen={isDanaModalOpen}
        onClose={() => setIsDanaModalOpen(false)}
        onSuccess={() => setIsDanaModalOpen(false)}
      />

      {/* Proof Inspection Lightbox Modal */}
      {viewingProofUrl && (() => {
        const isPdf = viewingProofUrl.startsWith('data:application/pdf') || viewingProofUrl.toLowerCase().includes('.pdf');
        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingProofUrl(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-5"
          >
            <div className="bg-stone-900 border border-stone-700 rounded-2xl p-4 sm:p-5 max-w-2xl w-full text-center space-y-3.5 shadow-2xl">
              <div className="flex justify-between items-center border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    {isPdf ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white">
                      Pratinjau Bukti Transfer Pembayaran
                    </h4>
                    <span className="text-[10px] text-stone-400">
                      {isPdf ? 'Format: Dokumen PDF Resmi' : 'Format: Foto / Screenshot Bukti Transfer'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingProofUrl(null)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isPdf ? (
                <div className="space-y-2">
                  <iframe
                    src={viewingProofUrl}
                    title="Dokumen Bukti Transfer PDF"
                    className="w-full h-[65vh] rounded-xl border border-stone-700 bg-white"
                  />
                  <div className="flex items-center justify-between text-[11px] px-1 text-stone-400">
                    <span>Dokumen PDF Bukti Transfer</span>
                    <a
                      href={viewingProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      download="bukti-transfer.pdf"
                      className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Buka Dokumen PDF di Tab Baru / Download
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-stone-950 rounded-xl p-2 border border-stone-800 flex items-center justify-center max-h-[68vh] overflow-hidden">
                    <img
                      src={viewingProofUrl}
                      alt="Bukti Transfer"
                      className="max-h-[64vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] px-1 text-stone-400">
                    <span>Foto / Screenshot Bukti Transfer</span>
                    <div className="flex items-center gap-3">
                      <a
                        href={viewingProofUrl}
                        download="bukti-transfer.jpg"
                        className="text-stone-300 hover:text-white hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                      <a
                        href={viewingProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Buka Gambar Penuh
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setViewingProofUrl(null)}
                  className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

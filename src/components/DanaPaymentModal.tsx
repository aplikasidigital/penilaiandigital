import React, { useState } from 'react';
import { User, EventConfig } from '../types';
import { StorageService, compressImageFile } from '../services/storage';
import { soundService } from '../services/sound';
import {
  X,
  CreditCard,
  QrCode,
  Copy,
  CheckCircle2,
  Upload,
  Coins,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DanaPaymentModalProps {
  currentUser: User;
  eventConfig: EventConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DanaPaymentModal: React.FC<DanaPaymentModalProps> = ({
  currentUser,
  eventConfig,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [jumlahVote, setJumlahVote] = useState<number>(5);
  const [pengirimNama, setPengirimNama] = useState(currentUser.name || '');
  const [pengirimNomorHp, setPengirimNomorHp] = useState(currentUser.phone || '');
  const [buktiTransferUrl, setBuktiTransferUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const hargaPerVote = 5000;
  const totalHarga = jumlahVote * hargaPerVote;

  const packages = [
    { votes: 1, bonus: 0, label: 'Starter' },
    { votes: 5, bonus: 0, label: 'Populer' },
    { votes: 10, bonus: 1, label: 'Hemat (+1 Bonus)' },
    { votes: 20, bonus: 3, label: 'Super (+3 Bonus)' },
  ];

  const handleCopyNomor = () => {
    soundService.playClick();
    const nomor = eventConfig.nomorDanaAdmin || '081314420312';
    navigator.clipboard?.writeText(nomor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImageFile(file, 800, 0.7);
      setBuktiTransferUrl(base64);
      soundService.playClick();
    } catch {
      setErrorMsg('Gagal memproses file gambar. Gunakan gambar JPG/PNG yang valid.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlahVote < 1) {
      setErrorMsg('Jumlah vote minimal adalah 1 vote.');
      return;
    }
    if (!pengirimNama.trim()) {
      setErrorMsg('Nama pengirim transfer wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newRequest = {
        id: 'topup_' + Date.now(),
        voterId: currentUser.id,
        voterNama: currentUser.name,
        jumlahVote,
        hargaTotal: totalHarga,
        metode: 'DANA_QRIS',
        nomorDanaTujuan: eventConfig.nomorDanaAdmin || '081314420312',
        buktiTransferUrl: buktiTransferUrl || '',
        pengirimNama: pengirimNama.trim(),
        pengirimNomorHp: pengirimNomorHp.trim(),
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      StorageService.addTopupRequest(newRequest);

      setIsSubmitting(false);
      setSubmitSuccess(true);
      soundService.playSuccessFanfare();

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti fallback
      }

      setTimeout(() => {
        setSubmitSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Gagal mengajukan top-up. Coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Coins className="w-5 h-5 text-stone-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-100 text-base">
                Top-up Saldo Vote Resmi
              </h3>
              <p className="text-xs text-stone-400">
                Dukungan Penuh via Transfer DANA & QRIS Standar
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-stone-100">
              Pengajuan Top-up Terkirim!
            </h4>
            <p className="text-xs text-stone-300 max-w-sm mx-auto leading-relaxed">
              Bukti transfer Anda telah masuk ke sistem panitia. Saldo vote Anda akan bertambah secara otomatis setelah diverifikasi oleh Admin.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Paket Vote */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-2">
                Pilih Paket Vote (Rp 5.000 / Vote)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {packages.map((pkg) => (
                  <button
                    type="button"
                    key={pkg.votes}
                    onClick={() => {
                      soundService.playClick();
                      setJumlahVote(pkg.votes);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      jumlahVote === pkg.votes
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="font-extrabold text-base text-stone-100">
                      {pkg.votes} Vote
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Rp {(pkg.votes * hargaPerVote).toLocaleString('id-ID')}
                    </div>
                    <div className="text-[9px] font-semibold text-amber-400 mt-0.5">
                      {pkg.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-3 bg-stone-950 p-3 rounded-xl border border-stone-800">
              <span className="text-xs text-stone-400 font-medium">Atau jumlah lain:</span>
              <input
                type="number"
                min="1"
                max="500"
                value={jumlahVote}
                onChange={(e) => setJumlahVote(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono text-center outline-none focus:border-amber-500"
              />
              <span className="text-xs font-bold text-amber-400 ml-auto">
                Total: Rp {totalHarga.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Info Rekening DANA Admin */}
            <div className="bg-gradient-to-br from-stone-950 to-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Rekening DANA Resmi
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Online
                </span>
              </div>

              <div className="flex items-center justify-between bg-stone-900/90 p-3 rounded-xl border border-stone-800">
                <div>
                  <div className="text-[11px] text-stone-400">Nomor Akun DANA:</div>
                  <div className="font-mono font-black text-sm text-amber-400 tracking-wider">
                    {eventConfig.nomorDanaAdmin || '081314420312'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    a.n. {eventConfig.namaAkunDana || 'S-IMPEL DIGITAL (081314420312)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyNomor}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              {eventConfig.qrisImageUrl && (
                <div className="text-center pt-2">
                  <div className="text-[11px] text-stone-400 mb-2">Scan QRIS Resmi:</div>
                  <img
                    src={eventConfig.qrisImageUrl}
                    alt="QRIS"
                    className="w-44 h-44 object-contain mx-auto rounded-xl border border-stone-700 bg-white p-2"
                  />
                </div>
              )}
            </div>

            {/* Form Pengirim & Bukti */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Nama Akun Pengirim (Sesuai DANA / Rekening Bank) *
                </label>
                <input
                  type="text"
                  required
                  value={pengirimNama}
                  onChange={(e) => setPengirimNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Nomor HP Pengirim
                </label>
                <input
                  type="tel"
                  value={pengirimNomorHp}
                  onChange={(e) => setPengirimNomorHp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Upload Bukti Transfer (Screenshot)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 border-dashed rounded-xl text-xs text-stone-400 hover:text-stone-200 hover:border-amber-500 flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{buktiTransferUrl ? 'Ganti Bukti Transfer' : 'Pilih File Screenshot...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {buktiTransferUrl && (
                    <img
                      src={buktiTransferUrl}
                      alt="Preview Bukti"
                      className="w-10 h-10 object-cover rounded-lg border border-stone-700"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Mengirimkan Pengajuan...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Konfirmasi & Ajukan Top-up (Rp {totalHarga.toLocaleString('id-ID')})</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

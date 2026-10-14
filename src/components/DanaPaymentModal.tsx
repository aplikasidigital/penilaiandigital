import React, { useState } from 'react';
import { User, EventConfig, TopupRequest } from '../types';
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
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DanaPaymentModalProps {
  currentUser: User;
  eventConfig: EventConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type TopupFlowStep = 'input_nominal' | 'show_qrcode' | 'upload_bukti' | 'waiting_verification';

export const DanaPaymentModal: React.FC<DanaPaymentModalProps> = ({
  currentUser,
  eventConfig,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<TopupFlowStep>('input_nominal');
  const [jumlahVote, setJumlahVote] = useState<number>(5);
  const [pengirimNama, setPengirimNama] = useState(currentUser.name || '');
  const [pengirimNomorHp, setPengirimNomorHp] = useState(currentUser.phone || '');
  const [buktiTransferUrl, setBuktiTransferUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedRequestId, setSubmittedRequestId] = useState<string>('');

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
      setErrorMsg('');
      soundService.playClick();
    } catch {
      setErrorMsg('Gagal memproses file gambar. Gunakan gambar JPG/PNG yang valid.');
    }
  };

  // Step 1 -> Step 2
  const handleProceedToQR = () => {
    soundService.playClick();
    if (jumlahVote < 1) {
      setErrorMsg('Jumlah vote minimal adalah 1 suara.');
      return;
    }
    setErrorMsg('');
    setStep('show_qrcode');
  };

  // Step 2 -> Step 3
  const handleProceedToUpload = () => {
    soundService.playClick();
    setErrorMsg('');
    setStep('upload_bukti');
  };

  // Step 3 -> Submit to Admin Queue
  const handleSubmitBukti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pengirimNama.trim()) {
      setErrorMsg('Nama akun pengirim transfer wajib diisi.');
      return;
    }
    if (!buktiTransferUrl) {
      setErrorMsg('Mohon unggah screenshot atau foto bukti transfer terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const reqId = 'topup_' + Date.now();
      const newRequest: TopupRequest = {
        id: reqId,
        voterId: currentUser.id,
        voterNama: currentUser.name,
        jumlahVote,
        hargaTotal: totalHarga,
        metode: 'DANA_QRIS',
        nomorDanaTujuan: eventConfig.nomorDanaAdmin || '081314420312',
        buktiTransferUrl: buktiTransferUrl || '',
        pengirimNama: pengirimNama.trim(),
        pengirimNomorHp: pengirimNomorHp.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      StorageService.addTopupRequest(newRequest);
      setSubmittedRequestId(reqId);

      setIsSubmitting(false);
      setStep('waiting_verification');
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

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Gagal mengajukan top-up. Coba lagi.');
    }
  };

  const handleFinishAndClose = () => {
    soundService.playClick();
    // Reset state for next time
    setStep('input_nominal');
    setBuktiTransferUrl('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative my-6 text-stone-100">
        
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Coins className="w-5 h-5 text-stone-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
                Top-up Saldo Vote Resmi
              </h3>
              <p className="text-[11px] text-stone-400">
                Sistem Pembayaran QR Code & Transfer DANA
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

        {/* Step Indicator Progress Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-stone-800/60 bg-stone-950/40">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400">
            <div className={`flex items-center gap-1.5 ${step === 'input_nominal' ? 'text-amber-400 font-bold' : 'text-emerald-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'input_nominal' ? 'bg-amber-500 text-stone-950' : 'bg-emerald-500 text-stone-950'
              }`}>
                {step !== 'input_nominal' ? '✓' : '1'}
              </span>
              <span>1. Nominal</span>
            </div>

            <div className="w-6 h-px bg-stone-700" />

            <div className={`flex items-center gap-1.5 ${step === 'show_qrcode' ? 'text-amber-400 font-bold' : step === 'upload_bukti' || step === 'waiting_verification' ? 'text-emerald-400' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'show_qrcode' ? 'bg-amber-500 text-stone-950' : step === 'upload_bukti' || step === 'waiting_verification' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800'
              }`}>
                {step === 'upload_bukti' || step === 'waiting_verification' ? '✓' : '2'}
              </span>
              <span>2. Scan QR</span>
            </div>

            <div className="w-6 h-px bg-stone-700" />

            <div className={`flex items-center gap-1.5 ${step === 'upload_bukti' ? 'text-amber-400 font-bold' : step === 'waiting_verification' ? 'text-emerald-400' : ''}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === 'upload_bukti' ? 'bg-amber-500 text-stone-950' : step === 'waiting_verification' ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800'
              }`}>
                {step === 'waiting_verification' ? '✓' : '3'}
              </span>
              <span>3. Bukti Bayar</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 1: INPUT NOMINAL & PILIH PAKET VOTE                 */}
        {/* ======================================================== */}
        {step === 'input_nominal' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-200 mb-2">
                Pilih Paket Suara Vote (Rp 5.000 / Vote)
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/50'
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
            <div className="flex items-center gap-3 bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <span className="text-xs text-stone-400 font-medium">Atau jumlah suara lain:</span>
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

            {/* Info Box */}
            <div className="bg-stone-950/60 border border-stone-800 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-stone-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                Tekan tombol proses di bawah untuk menampilkan <strong>QR Code pembayaran</strong>. Anda dapat melakukan scan transfer terlebih dahulu sebelum mengunggah bukti bayar pada langkah selanjutnya.
              </div>
            </div>

            {/* Process Button */}
            <button
              type="button"
              onClick={handleProceedToQR}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Proses Pembayaran QR Code (Rp {totalHarga.toLocaleString('id-ID')})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: TAMPILKAN QR CODE PEMBAYARAN TANPA FORM UPLOAD   */}
        {/* ======================================================== */}
        {step === 'show_qrcode' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Tagihan Info */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-400 font-semibold block">Total Tagihan Top-up:</span>
                <span className="text-xl font-mono font-black text-amber-300">
                  Rp {totalHarga.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-400 block">Jumlah Vote</span>
                <span className="text-xs font-bold text-stone-200 px-2 py-0.5 bg-stone-900 border border-stone-700 rounded-lg">
                  {jumlahVote} Suara
                </span>
              </div>
            </div>

            {/* QR Code Container (Tanpa form upload) */}
            <div className="bg-gradient-to-br from-stone-950 to-stone-900 border border-stone-800 rounded-2xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-200">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>QR Code QRIS / Transfer Pembayaran</span>
              </div>

              {eventConfig.qrisImageUrl ? (
                <div className="inline-block p-3 bg-white rounded-2xl shadow-lg border border-stone-300 max-w-[220px]">
                  <img
                    src={eventConfig.qrisImageUrl}
                    alt="QRIS Resmi"
                    className="w-48 h-48 object-contain mx-auto rounded-lg"
                  />
                  <div className="text-[9px] font-bold text-stone-900 mt-1 uppercase tracking-wider">
                    QRIS Standar Indonesia
                  </div>
                </div>
              ) : (
                /* Fallback Elegant QR Code SVG Placeholder */
                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-stone-300 max-w-[220px]">
                  <svg className="w-44 h-44 mx-auto text-stone-950" viewBox="0 0 100 100" fill="currentColor">
                    {/* Corner top-left */}
                    <rect x="5" y="5" width="28" height="28" rx="4" />
                    <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="13" width="12" height="12" rx="1" />
                    {/* Corner top-right */}
                    <rect x="67" y="5" width="28" height="28" rx="4" />
                    <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="75" y="13" width="12" height="12" rx="1" />
                    {/* Corner bottom-left */}
                    <rect x="5" y="67" width="28" height="28" rx="4" />
                    <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="75" width="12" height="12" rx="1" />
                    {/* Matrix pattern dots */}
                    <rect x="38" y="10" width="8" height="8" />
                    <rect x="50" y="10" width="8" height="8" />
                    <rect x="38" y="24" width="8" height="8" />
                    <rect x="52" y="24" width="8" height="8" />
                    <rect x="10" y="38" width="8" height="8" />
                    <rect x="24" y="38" width="8" height="8" />
                    <rect x="38" y="38" width="24" height="24" rx="2" />
                    <rect x="42" y="42" width="16" height="16" fill="white" rx="1" />
                    <rect x="46" y="46" width="8" height="8" fill="#d97706" />
                    <rect x="68" y="38" width="10" height="6" />
                    <rect x="82" y="42" width="8" height="8" />
                    <rect x="68" y="52" width="8" height="12" />
                    <rect x="38" y="68" width="8" height="8" />
                    <rect x="50" y="74" width="10" height="8" />
                    <rect x="38" y="82" width="14" height="8" />
                    <rect x="68" y="70" width="12" height="8" />
                    <rect x="84" y="68" width="6" height="14" />
                    <rect x="74" y="84" width="14" height="8" />
                  </svg>
                  <div className="text-[10px] font-black text-amber-800 mt-1 uppercase tracking-wider">
                    SCAN QRIS DANA RESMI
                  </div>
                </div>
              )}

              {/* Info Nomor Rekening DANA Admin dengan Tombol Salin */}
              <div className="flex items-center justify-between bg-stone-900/90 p-3 rounded-xl border border-stone-800 text-left">
                <div>
                  <div className="text-[10px] text-stone-400">Atau Transfer Manual Nomor DANA:</div>
                  <div className="font-mono font-black text-sm text-amber-400 tracking-wider">
                    {eventConfig.nomorDanaAdmin || '081314420312'}
                  </div>
                  <div className="text-[10px] text-stone-400">
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

              {/* Instruksi Singkat */}
              <div className="text-[11px] text-stone-400 text-left bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1">
                <div className="font-bold text-stone-300">Langkah Transfer:</div>
                <p>1. Buka aplikasi DANA / BCA / GoPay / OVO / ShopeePay / Mobile Banking.</p>
                <p>2. Scan kode QR di atas atau transfer ke nomor DANA admin.</p>
                <p>3. Masukkan nominal pas <strong>Rp {totalHarga.toLocaleString('id-ID')}</strong>.</p>
                <p>4. Setelah pembayaran berhasil, simpan screenshot dan tekan tombol di bawah.</p>
              </div>
            </div>

            {/* Navigasi: Kembali atau Lanjut Upload Bukti */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setStep('input_nominal');
                }}
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Ubah Nominal</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToUpload}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Saya Sudah Transfer, Unggah Bukti Bayar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: FORM UNGGAH BUKTI PEMBAYARAN                    */}
        {/* ======================================================== */}
        {step === 'upload_bukti' && (
          <form onSubmit={handleSubmitBukti} className="p-5 sm:p-6 space-y-4">
            {/* Tagihan Summary Bar */}
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
              <div className="text-stone-400">
                <span>Paket: </span>
                <strong className="text-stone-100">{jumlahVote} Vote</strong>
              </div>
              <div className="font-mono font-bold text-amber-400">
                Rp {totalHarga.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3.5">
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
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Nomor HP / WhatsApp Pengirim
                </label>
                <input
                  type="tel"
                  value={pengirimNomorHp}
                  onChange={(e) => setPengirimNomorHp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                  Upload Bukti Transfer (Screenshot / Struk Pembayaran) *
                </label>
                <div className="space-y-2">
                  <label className="w-full px-4 py-3 bg-stone-950 border border-stone-700 border-dashed rounded-xl text-xs text-stone-400 hover:text-stone-200 hover:border-amber-500 flex items-center justify-center gap-2 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{buktiTransferUrl ? 'Ganti File Bukti Transfer' : 'Pilih File Gambar Screenshot...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {buktiTransferUrl && (
                    <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center gap-3">
                      <img
                        src={buktiTransferUrl}
                        alt="Preview Bukti"
                        className="w-14 h-14 object-cover rounded-lg border border-stone-700"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Bukti Gambar Terlampir
                        </span>
                        <p className="text-[10px] text-stone-400 truncate">
                          Siap dikirim untuk verifikasi admin
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setStep('show_qrcode');
                }}
                className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>QR Code</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !buktiTransferUrl}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Mengirimkan Bukti...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim Bukti Pembayaran</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 4: STATUS MENUNGGU VERIFIKASI ADMIN                 */}
        {/* ======================================================== */}
        {step === 'waiting_verification' && (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-950/40">
              <Clock className="w-9 h-9 animate-pulse" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
                Menunggu Verifikasi Admin
              </div>
              <h4 className="text-lg font-bold text-stone-100">
                Bukti Pembayaran Berhasil Dikirim!
              </h4>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-stone-400">ID Pengajuan:</span>
                <span className="font-mono text-stone-200">{submittedRequestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Nominal Transfer:</span>
                <span className="font-mono font-bold text-emerald-400">
                  Rp {totalHarga.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Suara Vote:</span>
                <span className="font-bold text-amber-400">{jumlahVote} Vote</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Pengirim:</span>
                <span className="text-stone-200">{pengirimNama}</span>
              </div>
              <div className="flex justify-between border-t border-stone-800 pt-2">
                <span className="text-stone-400">Status Pesanan:</span>
                <span className="text-amber-400 font-bold">Menunggu Verifikasi Admin</span>
              </div>
            </div>

            <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
              Bukti pembayaran Anda telah masuk ke daftar antrean Admin. Saldo vote Anda akan otomatis bertambah setelah panitia memverifikasi mutasi pembayaran.
            </p>

            <button
              type="button"
              onClick={handleFinishAndClose}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

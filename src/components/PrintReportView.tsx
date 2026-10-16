import React, { useRef, useState } from 'react';
import { EventConfig, MataLomba, Peserta, NilaiSubmission, RankingParticipant, User } from '../types';
import { StorageService } from '../services/storage';
import { soundService } from '../services/sound';
import { Printer, Download, X, Award, ShieldCheck, Clock, Loader2, FileText, CheckCircle2, UserCheck, Layers } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export type PrintModeType =
  | 'rekapan_per_matalomba'
  | 'rekapan_keseluruhan'
  | 'blangko_akumulasi_dewan_juri'
  | 'blangko_per_peserta_per_lomba'
  | 'blangko_per_peserta_semua_lomba'
  | 'blangko_semua_peserta_per_lomba'
  | 'blangko_semua_peserta_semua_lomba';

interface PrintReportViewProps {
  mode: PrintModeType;
  selectedMataLombaId?: string;
  selectedPesertaId?: string;
  selectedJuriId?: string;
  includeFilledScores?: boolean;
  eventConfig: EventConfig;
  onClose: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  mode,
  selectedMataLombaId,
  selectedPesertaId,
  selectedJuriId,
  includeFilledScores = true,
  eventConfig,
  onClose,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [currentMode, setCurrentMode] = useState<PrintModeType>(mode);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [activeJuriId, setActiveJuriId] = useState<string>(selectedJuriId || '');
  const [rekapTab, setRekapTab] = useState<'keduanya' | 'rekapan' | 'hasil_akhir'>('keduanya');

  const allMataLomba = StorageService.getMataLomba();
  const allPeserta = StorageService.getPeserta();
  const allSubmissions = StorageService.getSubmissions();
  const allUsers = StorageService.getUsers();
  const allJuriUsers = allUsers.filter((u) => u.role === 'juri');

  const selectedMl = allMataLomba.find((m) => m.id === selectedMataLombaId) || allMataLomba[0];
  const selectedPst = allPeserta.find((p) => p.id === selectedPesertaId);
  const activeJuriUser = allJuriUsers.find((u) => u.id === activeJuriId);

  // Target Mata Lomba list based on mode
  const targetLombaList = currentMode.includes('semua_lomba') || currentMode === 'rekapan_keseluruhan'
    ? allMataLomba
    : selectedMl ? [selectedMl] : [];

  const handleNativePrint = () => {
    soundService.playClick();
    window.print();
  };

  const handleDownloadPdf = async () => {
    soundService.playClick();
    if (!printContentRef.current || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const element = printContentRef.current;

      // Jika mode Blangko Penilaian: pisahkan setiap nomor peserta ke lembaran/halaman PDF baru secara otomatis
      if (!mode.startsWith('rekapan')) {
        const participantCards = element.querySelectorAll<HTMLElement>('.peserta-blangko-card');
        if (participantCards.length > 0) {
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfPageHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < participantCards.length; i++) {
            const cardEl = participantCards[i];
            const cardCanvas = await html2canvas(cardEl, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 1200,
            });

            if (i > 0) {
              pdf.addPage();
            }

            const imgData = cardCanvas.toDataURL('image/png');
            const margin = 8;
            const printWidth = pdfWidth - (margin * 2);
            const printHeight = (cardCanvas.height * printWidth) / cardCanvas.width;

            pdf.addImage(
              imgData,
              'PNG',
              margin,
              margin,
              printWidth,
              Math.min(printHeight, pdfPageHeight - (margin * 2))
            );
          }

          const juriSuffix = activeJuriUser ? `_${activeJuriUser.username}` : '_SEMUA_JURI';
          pdf.save(`Blangko_Penilaian_${(selectedMl?.kode || 'ALL')}${juriSuffix}_${Date.now()}.pdf`);
          soundService.playSuccessFanfare();
          setIsExporting(false);
          return;
        }
      }

      // Mode Berita Acara & Rekapitulasi: Multi-page slicing dokumen rangkuman
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Memastikan layout konsisten dalam proporsi standar dokumen A4
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const totalPdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (totalPdfHeight <= pdfPageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, totalPdfHeight);
      } else {
        let heightLeft = totalPdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pdfPageHeight;

        while (heightLeft > 0) {
          position -= pdfPageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalPdfHeight);
          heightLeft -= pdfPageHeight;
        }
      }

      const juriSuffix = activeJuriUser ? `_${activeJuriUser.username}` : '_GABUNGAN_AKUMULASI';
      pdf.save(`Laporan_Resmi_${mode}${juriSuffix}_${Date.now()}.pdf`);
      soundService.playSuccessFanfare();
    } catch (err: any) {
      console.error('Failed to export PDF', err);
      setExportError(err?.message || 'Gagal mengekspor dokumen ke PDF');
      soundService.playError();
    } finally {
      setIsExporting(false);
    }
  };

  const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-950 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-sm flex items-center gap-2">
                Pratinjau Dokumen Cetak & PDF
                {currentMode === 'blangko_akumulasi_dewan_juri' ? (
                  <span className="text-[10px] bg-emerald-950 border border-emerald-500 text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-400" />
                    Akumulasi Nilai Dewan Juri (1 Format Tunggal)
                  </span>
                ) : activeJuriUser ? (
                  <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    Khusus: {activeJuriUser.name}
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-950 border border-emerald-600/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Akumulasi Gabungan Multi-Juri
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-stone-400">
                Format Berita Acara & Blangko Penilaian Standar Panitia (A4 & Cetak Terpisah Per Juri)
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Filter Juri Selector */}
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 px-2.5 py-1.5 rounded-xl">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-stone-300">Pilihan Juri:</span>
              <select
                value={activeJuriId}
                onChange={(e) => {
                  soundService.playClick();
                  setActiveJuriId(e.target.value);
                }}
                className="bg-stone-950 border border-stone-700 text-amber-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="">Semua Juri (Gabungan & Akumulasi)</option>
                {allJuriUsers.map((j, idx) => (
                  <option key={j.id} value={j.id}>
                    Juri {idx + 1}: {j.name} ({j.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Tampilan Cepat: Akumulasi Nilai Dewan Juri vs Blangko Standar */}
            {!currentMode.startsWith('rekapan') && (
              <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
                <button
                  onClick={() => {
                    soundService.playClick();
                    setCurrentMode('blangko_akumulasi_dewan_juri');
                    setActiveJuriId('');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    currentMode === 'blangko_akumulasi_dewan_juri'
                      ? 'bg-emerald-500 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Tampilkan 1 Lembar Blangko Tunggal Akumulasi Semua Dewan Juri dengan Tanda Tangan Lengkap"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Akumulasi Dewan Juri</span>
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    setCurrentMode('blangko_semua_peserta_per_lomba');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    currentMode !== 'blangko_akumulasi_dewan_juri'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Tampilkan Blangko Standar Per Juri"
                >
                  Blangko Per Juri
                </button>
              </div>
            )}

            {/* Mode Rekapan Tab Switcher */}
            {currentMode.startsWith('rekapan') && !activeJuriId && (
              <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
                <button
                  onClick={() => {
                    soundService.playClick();
                    setRekapTab('keduanya');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    rekapTab === 'keduanya'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Tampilkan Rekapan Rincian Juri dan Hasil Akhir"
                >
                  Semua Format
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    setRekapTab('rekapan');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    rekapTab === 'rekapan'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Format Rekapan Rincian Juri 1, 2, dst. & Total Gabungan"
                >
                  Format Rekapan
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    setRekapTab('hasil_akhir');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    rekapTab === 'hasil_akhir'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title="Format Hasil Penilaian Akhir (Perangkingan Nilai Gabungan Sah)"
                >
                  Format Hasil Akhir
                </button>
              </div>
            )}

            {exportError && (
              <span className="text-xs text-rose-400 mr-2 max-w-xs truncate" title={exportError}>
                {exportError}
              </span>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isExporting
                  ? 'bg-stone-800 text-stone-400 cursor-not-allowed opacity-80'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simpan PDF A4</span>
                </>
              )}
            </button>
            <button
              onClick={handleNativePrint}
              disabled={isExporting}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer ml-1"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 md:p-8 bg-stone-950 flex justify-center items-start">
          <div
            id="printable-paper"
            ref={printContentRef}
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-stone-900 p-6 sm:p-10 md:p-12 shadow-2xl rounded-sm print:p-0 print:shadow-none print:m-0 text-xs leading-normal"
          >
            {/* KOP Surat & Header Acara */}
            <div className="border-b-2 border-stone-900 pb-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                {eventConfig.logoUrl ? (
                  <img
                    src={eventConfig.logoUrl}
                    alt="Logo"
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-stone-800 flex items-center justify-center font-bold text-stone-700">
                    LOGO
                  </div>
                )}
                <div className="flex-1 text-center">
                  <h1 className="font-extrabold text-base uppercase tracking-wider text-stone-900">
                    {eventConfig.judulKegiatan || 'PANITIA PENYELENGGARA LOMBA DIGITAL'}
                  </h1>
                  <h2 className="font-bold text-xs uppercase tracking-wide text-stone-700">
                    {eventConfig.penyelenggara || 'S-IMPEL DIGITAL RESMI'}
                  </h2>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Lokasi: {eventConfig.tempat || 'Jawa Barat'} | Waktu: {eventConfig.tanggalWaktu || 'Oktober 2026'}
                  </p>
                </div>
                <div className="w-14 h-14 flex flex-col items-center justify-center border border-stone-300 rounded p-1 text-[9px] text-stone-500 text-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mb-0.5" />
                  <span>DOKUMEN RESMI</span>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-4">
              <h3 className="font-extrabold text-sm uppercase underline tracking-wide">
                {currentMode.startsWith('rekapan')
                  ? activeJuriUser
                    ? `BERITA ACARA REKAPAN NILAI RESMI - JURI: ${activeJuriUser.name.toUpperCase()}`
                    : 'BERITA ACARA & REKAPITULASI NILAI DEWAN JURI (AKUMULASI RESMI)'
                  : currentMode === 'blangko_akumulasi_dewan_juri'
                    ? 'LEMBAR BLANGKO AKUMULASI NILAI RESMI DEWAN JURI'
                    : activeJuriUser
                      ? `LEMBAR FORMULIR PENILAIAN JURI: ${activeJuriUser.name.toUpperCase()}`
                      : 'LEMBAR FORMULIR PENILAIAN PERLOMBAAN'}
              </h3>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Nomor Register: REG-SP/{(selectedMl?.kode || 'ALL')}/{currentMode === 'blangko_akumulasi_dewan_juri' ? 'AKUMULASI-DEWAN-JURI' : activeJuriUser ? `JURI-${activeJuriUser.username.toUpperCase()}` : 'GABUNGAN'}-{Date.now().toString().slice(-4)}
              </p>
            </div>

            {/* Loop over target competitions */}
            {targetLombaList.map((ml) => {
              const rankings = StorageService.calculateRanking(ml.id);
              const lombaPeserta = currentMode.includes('per_peserta') && selectedPst
                ? [selectedPst]
                : allPeserta.filter((p) => p.mataLombaId === ml.id || (Array.isArray(p.mataLombaIds) && p.mataLombaIds.includes(ml.id)));

              // Juri yang bertugas di mata lomba ini
              const assignedJuris = allJuriUsers.filter(
                (u) =>
                  (ml.assignedJuriIds && ml.assignedJuriIds.includes(u.id)) ||
                  (Array.isArray(u.assignedMataLombaIds) && u.assignedMataLombaIds.includes(ml.id)) ||
                  allSubmissions.some((s) => s.mataLombaId === ml.id && s.juriId === u.id)
              );
              const displayedJuris = assignedJuris.length > 0 ? assignedJuris : allJuriUsers.slice(0, 3);

              return (
                <div key={ml.id} className="mb-8">
                  <div className="bg-stone-100 p-2.5 rounded border border-stone-300 mb-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-800">
                        Mata Lomba: [{ml.kode}] {ml.nama}
                      </span>
                      <span className="text-[11px] text-stone-600 ml-2">
                        ({ml.kategori || 'Kategori Umum'})
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500">
                      Target Waktu: {formatSeconds(ml.durasiTargetDetik)} | Max: {ml.durasiMaksimalMenit} Menit
                    </div>
                  </div>

                  {/* MODE REKAPAN: Gabungan Multi-Juri atau Khusus Per Juri */}
                  {mode.startsWith('rekapan') ? (
                    <div>
                      {/* SUB-KASUS 1: Rekapan Khusus Juri Tertentu */}
                      {activeJuriUser ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-[11px] bg-amber-50 border border-amber-200 p-2 rounded text-stone-800">
                            <div>
                              <strong>Rekapan Penilaian Khusus:</strong> {activeJuriUser.name} ({activeJuriUser.username})
                            </div>
                            <div className="text-[10px] text-stone-600">
                              Mata Lomba: [{ml.kode}] {ml.nama}
                            </div>
                          </div>

                          {/* Tabel Rekapan Khusus Juri Terpilih */}
                          <table className="w-full border-collapse border border-stone-400 text-[11px] mb-4">
                            <thead>
                              <tr className="bg-stone-200 text-stone-800 font-bold">
                                <th className="border border-stone-400 p-1.5 w-10 text-center">No</th>
                                <th className="border border-stone-400 p-1.5 w-14 text-center">No. Dada</th>
                                <th className="border border-stone-400 p-1.5 text-left">Nama Peserta</th>
                                <th className="border border-stone-400 p-1.5 text-left">Asal Instansi</th>
                                <th className="border border-stone-400 p-1.5 w-16 text-center">Waktu</th>
                                <th className="border border-stone-400 p-1.5 w-20 text-center bg-amber-100 text-stone-900 font-extrabold">
                                  Nilai Juri
                                </th>
                                <th className="border border-stone-400 p-1.5 text-left">Catatan Juri</th>
                                <th className="border border-stone-400 p-1.5 w-24 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lombaPeserta.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="p-3 text-center text-stone-500 border border-stone-400">
                                    Tidak ada data peserta pada mata lomba ini.
                                  </td>
                                </tr>
                              ) : (
                                lombaPeserta
                                  .map((pst) => {
                                    const sub = allSubmissions.find(
                                      (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id && s.juriId === activeJuriUser.id
                                    );
                                    return { pst, sub };
                                  })
                                  .sort((a, b) => {
                                    const scoreA = a.sub && a.sub.status === 'approved' ? Number(a.sub.totalNilai) || 0 : -1;
                                    const scoreB = b.sub && b.sub.status === 'approved' ? Number(b.sub.totalNilai) || 0 : -1;
                                    return scoreB - scoreA;
                                  })
                                  .map((item, idx) => {
                                    const hasScore = item.sub && item.sub.status === 'approved';
                                    return (
                                      <tr key={item.pst.id} className="hover:bg-stone-50">
                                        <td className="border border-stone-400 p-1.5 text-center font-bold">
                                          {idx + 1}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-mono">
                                          {item.pst.nomorDada}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 font-semibold break-words whitespace-normal [word-break:break-word]">
                                          {item.pst.nama}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-stone-700 break-words whitespace-normal [word-break:break-word]">
                                          {item.pst.asalInstansi}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-mono">
                                          {item.sub ? formatSeconds(item.sub.waktuPengerjaanDetik) : '-'}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-extrabold text-stone-950 bg-amber-50">
                                          {hasScore ? item.sub!.totalNilai : <span className="text-stone-400">-</span>}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-stone-600 text-[10px] break-words whitespace-normal [word-break:break-word]">
                                          {item.sub?.catatanJuri || '-'}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center text-[10px]">
                                          {hasScore ? (
                                            <span className="font-bold text-emerald-800">Terverifikasi</span>
                                          ) : (
                                            <span className="text-stone-400">Belum Dinilai</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* SUB-KASUS 2: Laporan Gabungan & Akumulasi Multi-Juri */
                        <div className="space-y-6">
                          
                          {/* TAB A: Format Rekapan Nilai Dewan Juri (Rincian Nilai Tiap Juri & Total Gabungan) */}
                          {(rekapTab === 'rekapan' || rekapTab === 'keduanya') && (
                            <div>
                              <div className="flex items-center justify-between mb-2 pb-1 border-b border-stone-300">
                                <h4 className="font-bold text-xs uppercase text-stone-900 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                                  1. Format Rekapan Nilai Dewan Juri (Rincian Per Juri & Total Akumulasi Gabungan)
                                </h4>
                                <span className="text-[10px] text-stone-500">
                                  Rincian Nilai Juri 1 s/d {displayedJuris.length} & Total Gabungan
                                </span>
                              </div>

                              <table className="w-full border-collapse border border-stone-400 text-[11px] mb-4">
                                <thead>
                                  <tr className="bg-stone-200 text-stone-800 font-bold">
                                    <th className="border border-stone-400 p-1.5 w-8 text-center">No</th>
                                    <th className="border border-stone-400 p-1.5 w-12 text-center">No. Dada</th>
                                    <th className="border border-stone-400 p-1.5 text-left min-w-[130px]">Nama Peserta</th>
                                    <th className="border border-stone-400 p-1.5 text-left min-w-[110px]">Asal Instansi</th>
                                    
                                    {/* Kolom Dinamis Nilai Per Juri */}
                                    {displayedJuris.map((juri, jIdx) => (
                                      <th
                                        key={juri.id}
                                        className="border border-stone-400 p-1.5 w-16 text-center bg-stone-100"
                                        title={juri.name}
                                      >
                                        <div className="font-bold">Nilai Juri {jIdx + 1}</div>
                                        <div className="text-[8px] font-normal text-stone-600 truncate max-w-[70px] mx-auto">
                                          {juri.name.split(',')[0]}
                                        </div>
                                      </th>
                                    ))}

                                    {/* Kolom Nilai Total Gabungan (Akumulasi Sah) */}
                                    <th className="border border-stone-400 p-1.5 w-20 text-center bg-amber-100 text-stone-900 font-extrabold">
                                      Nilai Total Gabungan
                                    </th>
                                    <th className="border border-stone-400 p-1.5 w-16 text-center">Rata-Rata</th>
                                    <th className="border border-stone-400 p-1.5 w-14 text-center">Waktu</th>
                                    <th className="border border-stone-400 p-1.5 w-24 text-center">Predikat</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rankings.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8 + displayedJuris.length}
                                        className="p-3 text-center text-stone-500 border border-stone-400"
                                      >
                                        Belum ada nilai yang diverifikasi panitia.
                                      </td>
                                    </tr>
                                  ) : (
                                    rankings.map((r, rIdx) => {
                                      return (
                                        <tr key={r.peserta.id} className="hover:bg-stone-50">
                                          <td className="border border-stone-400 p-1.5 text-center font-bold">
                                            {rIdx + 1}
                                          </td>
                                          <td className="border border-stone-400 p-1.5 text-center font-mono">
                                            {r.peserta.nomorDada}
                                          </td>
                                          <td className="border border-stone-400 p-1.5 font-semibold break-words whitespace-normal [word-break:break-word]">
                                            {r.peserta.nama}
                                          </td>
                                          <td className="border border-stone-400 p-1.5 text-stone-700 break-words whitespace-normal [word-break:break-word]">
                                            {r.peserta.asalInstansi}
                                          </td>

                                          {/* Nilai masing-masing juri */}
                                          {displayedJuris.map((juri) => {
                                            const jSub = allSubmissions.find(
                                              (s) =>
                                                s.mataLombaId === ml.id &&
                                                s.pesertaId === r.peserta.id &&
                                                s.juriId === juri.id &&
                                                s.status === 'approved'
                                            );
                                            return (
                                              <td
                                                key={juri.id}
                                                className="border border-stone-400 p-1.5 text-center font-semibold"
                                              >
                                                {jSub ? jSub.totalNilai : <span className="text-stone-400">-</span>}
                                              </td>
                                            );
                                          })}

                                          {/* Nilai Total Gabungan (Akumulasi Sah Semua Juri) */}
                                          <td className="border border-stone-400 p-1.5 text-center font-extrabold text-stone-950 bg-amber-50">
                                            {r.totalNilaiGabungan !== undefined && r.totalNilaiGabungan > 0
                                              ? r.totalNilaiGabungan.toFixed(2)
                                              : r.rataRataNilai > 0
                                                ? r.rataRataNilai.toFixed(2)
                                                : '-'}
                                          </td>

                                          {/* Rata-Rata Nilai */}
                                          <td className="border border-stone-400 p-1.5 text-center font-semibold text-stone-800">
                                            {r.rataRataNilai > 0 ? r.rataRataNilai.toFixed(2) : '-'}
                                          </td>

                                          {/* Waktu Tempuh */}
                                          <td className="border border-stone-400 p-1.5 text-center font-mono text-[10px]">
                                            {formatSeconds(r.rataRataWaktuDetik)}
                                          </td>

                                          {/* Predikat */}
                                          <td className="border border-stone-400 p-1.5 text-center font-bold text-amber-900 text-[10px]">
                                            {r.predikatJuara || '-'}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* TAB B: Format Hasil Penilaian Akhir (Perangkingan Nilai Akumulasi Sah) */}
                          {(rekapTab === 'hasil_akhir' || rekapTab === 'keduanya') && (
                            <div className={rekapTab === 'keduanya' ? 'mt-6 pt-4 border-t-2 border-dashed border-stone-300' : ''}>
                              <div className="flex items-center justify-between mb-2 pb-1 border-b border-stone-300">
                                <h4 className="font-bold text-xs uppercase text-stone-900 flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-amber-600" />
                                  2. Format Hasil Penilaian Akhir (Perangkingan Resmi Nilai Akumulasi Sah)
                                </h4>
                                <span className="text-[10px] text-stone-500 font-medium">
                                  Berdasarkan Nilai Total Gabungan Akumulasi Sah Sesuai Aturan Kompetisi
                                </span>
                              </div>

                              <table className="w-full border-collapse border border-stone-400 text-[11px] mb-4">
                                <thead>
                                  <tr className="bg-stone-200 text-stone-800 font-bold">
                                    <th className="border border-stone-400 p-1.5 w-12 text-center">Peringkat</th>
                                    <th className="border border-stone-400 p-1.5 w-14 text-center">No. Dada</th>
                                    <th className="border border-stone-400 p-1.5 text-left">Nama Peserta</th>
                                    <th className="border border-stone-400 p-1.5 text-left">Asal Instansi</th>
                                    <th className="border border-stone-400 p-1.5 w-16 text-center">Waktu</th>
                                    <th className="border border-stone-400 p-1.5 w-16 text-center">Jml Juri</th>
                                    <th className="border border-stone-400 p-1.5 w-24 text-center bg-amber-100 text-stone-950 font-black">
                                      Nilai Akumulasi Sah
                                    </th>
                                    <th className="border border-stone-400 p-1.5 w-16 text-center">Rata-rata</th>
                                    <th className="border border-stone-400 p-1.5 w-28 text-center">Predikat Juara</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rankings.length === 0 ? (
                                    <tr>
                                      <td colSpan={9} className="p-3 text-center text-stone-500 border border-stone-400">
                                        Belum ada nilai yang diverifikasi panitia.
                                      </td>
                                    </tr>
                                  ) : (
                                    rankings.map((r) => (
                                      <tr key={r.peserta.id} className="hover:bg-stone-50">
                                        <td className="border border-stone-400 p-1.5 text-center font-extrabold text-xs">
                                          {r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : r.rank}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-mono font-bold">
                                          {r.peserta.nomorDada}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 font-bold break-words whitespace-normal [word-break:break-word]">
                                          {r.peserta.nama}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-stone-700 break-words whitespace-normal [word-break:break-word]">
                                          {r.peserta.asalInstansi}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-mono">
                                          {formatSeconds(r.rataRataWaktuDetik)}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center text-[10px]">
                                          {r.jumlahJuriMenilai} Juri
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-black text-xs text-stone-950 bg-amber-50">
                                          {r.totalNilaiGabungan !== undefined && r.totalNilaiGabungan > 0
                                            ? r.totalNilaiGabungan.toFixed(2)
                                            : r.rataRataNilai > 0
                                              ? r.rataRataNilai.toFixed(2)
                                              : '-'}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-semibold text-stone-700">
                                          {r.rataRataNilai > 0 ? r.rataRataNilai.toFixed(2) : '-'}
                                        </td>
                                        <td className="border border-stone-400 p-1.5 text-center font-black text-amber-900">
                                          {r.predikatJuara || '-'}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODE BLANGKO PENILAIAN JURI (Lembar Cetak Peserta dengan Pisah Halaman) */
                    <div className="space-y-6">
                      {lombaPeserta.map((pst, pstIdx) => {
                        const isAkumulasiBlangko = currentMode === 'blangko_akumulasi_dewan_juri';

                        // Ambil seluruh submission dari semua juri untuk peserta ini pada mata lomba ini
                        const participantApprovedSubs = allSubmissions.filter(
                          (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id && s.status === 'approved'
                        );
                        const participantAllSubs = allSubmissions.filter(
                          (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id
                        );
                        const activeSubs = participantApprovedSubs.length > 0 ? participantApprovedSubs : participantAllSubs;

                        // Tentukan submission tunggal jika mode per juri atau filter aktif
                        const specificSub = activeJuriUser
                          ? allSubmissions.find(
                              (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id && s.juriId === activeJuriUser.id
                            )
                          : allSubmissions.find(
                              (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id && s.status === 'approved'
                            ) || participantAllSubs[0];

                        // Hitung total akumulasi gabungan seluruh dewan juri
                        const totalAkumulasi = activeSubs.reduce(
                          (sum, s) => sum + (Number(s.totalNilai) || 0),
                          0
                        );

                        // Waktu tempuh (jika akumulasi, ambil waktu rata-rata atau submission valid pertama)
                        const waktuDetik = isAkumulasiBlangko
                          ? activeSubs.length > 0
                            ? Math.round(activeSubs.reduce((acc, s) => acc + (s.waktuPengerjaanDetik || 0), 0) / activeSubs.length)
                            : (specificSub?.waktuPengerjaanDetik || 0)
                          : (specificSub?.waktuPengerjaanDetik || 0);

                        return (
                          <div
                            key={pst.id}
                            className="peserta-blangko-card peserta-page-break bg-white border border-stone-300 p-4 sm:p-5 rounded-lg mb-6 break-inside-avoid print:break-inside-avoid print:border-none print:p-0 print:m-0 print:[break-before:page] print:[page-break-before:always] first:print:[break-before:auto] first:print:[page-break-before:auto]"
                            style={{
                              breakBefore: pstIdx === 0 ? 'auto' : 'page',
                              pageBreakBefore: pstIdx === 0 ? 'auto' : 'always',
                            }}
                          >
                            {/* Kop & Identitas Mandiri Lembar Penilaian Peserta */}
                            <div className="border-b-2 border-stone-800 pb-2 mb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-extrabold text-xs uppercase tracking-wider text-stone-900">
                                    {eventConfig.judulKegiatan || 'PANITIA PENYELENGGARA LOMBA DIGITAL'}
                                  </div>
                                  <div className="text-[10px] text-stone-600 font-medium">
                                    {eventConfig.penyelenggara || 'S-IMPEL DIGITAL'} | {eventConfig.tempat || 'Jawa Barat'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                    isAkumulasiBlangko
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold'
                                      : 'bg-stone-100 border-stone-300 text-stone-700'
                                  }`}>
                                    {isAkumulasiBlangko
                                      ? 'BLANGKO RESMI: AKUMULASI NILAI DEWAN JURI'
                                      : activeJuriUser
                                        ? `BLANGKO RESMI: ${activeJuriUser.name}`
                                        : 'LEMBAR BLANGKO PENILAIAN JURI'}
                                  </span>
                                  <div className="text-[9px] text-stone-500 font-mono mt-0.5">
                                    Mata Lomba: [{ml.kode}] {ml.nama}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-start mb-3 border-b border-stone-200 pb-2 gap-2">
                              <div className="min-w-0 flex-1 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-sm text-stone-900 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]">
                                    {pst.nomorDada} - {pst.nama}
                                  </span>
                                  {isAkumulasiBlangko && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-400/50 px-2 py-0.5 rounded-full font-bold">
                                      ✓ Akumulasi Sah ({activeSubs.length} Juri Menilai)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-600 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] mt-0.5">
                                  {pst.asalInstansi}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-stone-500 block">Waktu Tempuh:</span>
                                <div className="font-mono font-bold text-stone-900">
                                  {waktuDetik > 0 ? formatSeconds(waktuDetik) : '___ : ___'}
                                </div>
                              </div>
                            </div>

                            {/* Tabel Blangko dengan Kolom Diperlebar & Tanpa Kolom Max Poin */}
                            <table className="w-full border-collapse border border-stone-300 text-[10px] mb-3 table-fixed">
                              <thead>
                                <tr className="bg-stone-100 font-semibold text-stone-800">
                                  <th className="border border-stone-300 p-0.5 sm:p-1 w-6 sm:w-7 text-center break-words [word-break:break-word] text-[9px]">
                                    No
                                  </th>
                                  <th className="border border-stone-300 p-1.5 text-left w-[23%] break-words [word-break:break-word]">
                                    Kriteria Penilaian
                                  </th>
                                  <th className="border border-stone-300 p-1.5 text-left w-[67%] break-words [word-break:break-word]">
                                    {isAkumulasiBlangko ? 'Rincian Hasil Penilaian Semua Dewan Juri' : 'Kotak Ceklis Penilaian (Skor)'}
                                  </th>
                                  <th className="border border-stone-300 p-0.5 sm:p-1 w-10 sm:w-12 text-center break-words [word-break:break-word] text-[8px] sm:text-[8.5px] leading-tight">
                                    {isAkumulasiBlangko ? 'Nilai Total' : 'Nilai Angka'}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {ml.kriteriaList.map((crit, idx) => {
                                  // Data nilai jika blangko tunggal / single juri
                                  const itemNilai = specificSub?.nilaiKriteria?.find(
                                    (k) => k.kriteriaId === crit.id
                                  );

                                  // Skala nilai kustom yang ditentukan admin (misal 1 s/d 6 untuk PBB, atau kustom lainnya)
                                  const scaleItems = crit.skalaNilai && crit.skalaNilai.length > 0
                                    ? crit.skalaNilai
                                    : Array.from(
                                        { length: Math.max(1, (crit.nilaiMaksimal || 5) - (crit.nilaiMin || 1) + 1) },
                                        (_, i) => (crit.nilaiMin || 1) + i
                                      );

                                  // Nilai akumulasi untuk kriteria ini dari semua juri aktif
                                  const critTotalAkumulasi = activeSubs.reduce((acc, sub) => {
                                    const kn = sub.nilaiKriteria?.find((k) => k.kriteriaId === crit.id);
                                    return acc + (kn ? Number(kn.nilai) || 0 : 0);
                                  }, 0);

                                  return (
                                    <tr key={crit.id} className="align-top hover:bg-stone-50/50">
                                      {/* Kolom 1: Nomor */}
                                      <td className="border border-stone-300 p-1.5 text-center font-mono align-middle">
                                        {idx + 1}
                                      </td>

                                      {/* Kolom 2: Kriteria Penilaian (HANYA Nama Kriteria Bersih Tanpa Teks Deskripsi Panjang) */}
                                      <td className="border border-stone-300 p-2 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] align-middle">
                                        <div className="font-bold text-stone-900 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] leading-snug">
                                          {crit.nama}
                                        </div>
                                      </td>

                                      {/* Kolom 3: Rincian Hasil Penilaian dari Semua Dewan Juri (Akumulasi) atau Kotak Ceklis (Standar) */}
                                      <td className="border border-stone-300 p-1.5 sm:p-2 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] align-middle box-border">
                                        {isAkumulasiBlangko ? (
                                          /* 1. BLANGKO AKUMULASI: RINCIAN PENILAIAN DARI SEMUA DEWAN JURI TANPA ELEMEN CEKLIS */
                                          <div className="space-y-1.5">
                                            <div className={`grid gap-1.5 ${
                                              displayedJuris.length <= 2
                                                ? 'grid-cols-2'
                                                : displayedJuris.length === 3
                                                  ? 'grid-cols-3'
                                                  : 'grid-cols-2 sm:grid-cols-4'
                                            }`}>
                                              {displayedJuris.map((juri, jIdx) => {
                                                const judgeSub = allSubmissions.find(
                                                  (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id && s.juriId === juri.id
                                                );
                                                const kItem = judgeSub?.nilaiKriteria?.find((k) => k.kriteriaId === crit.id);
                                                const scoreVal = kItem ? Number(kItem.nilai) || 0 : (judgeSub ? 0 : null);

                                                return (
                                                  <div
                                                    key={juri.id}
                                                    className="bg-stone-50 border border-stone-200/90 rounded p-1.5 flex items-center justify-between shadow-2xs"
                                                  >
                                                    <div className="min-w-0 mr-1.5">
                                                      <span className="font-bold text-[9px] text-stone-800 block truncate">
                                                        Dewan Juri {jIdx + 1}
                                                      </span>
                                                      <span className="text-[8px] text-stone-500 block truncate">
                                                        {juri.name}
                                                      </span>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                      <span className="font-mono font-black text-xs text-stone-950 bg-white border border-stone-300 px-2 py-0.5 rounded shadow-2xs">
                                                        {scoreVal !== null ? scoreVal : '-'}
                                                      </span>
                                                      <span className="text-[8px] text-stone-500 ml-1">Poin</span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>

                                            {/* Baris Keterangan Transparan & Rata-rata */}
                                            <div className="flex flex-wrap items-center justify-between text-[8px] text-stone-600 px-1 pt-1 border-t border-stone-200">
                                              <span>
                                                Data Masuk: <strong>{activeSubs.length}</strong> dari {displayedJuris.length} Dewan Juri
                                              </span>
                                              {activeSubs.length > 0 && (
                                                <span className="font-mono font-semibold text-stone-700">
                                                  Rata-rata: {(critTotalAkumulasi / activeSubs.length).toFixed(2)} Poin
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          /* 2. BLANGKO STANDAR: KOTAK CEKLIS PENILAIAN PER JURI (MAKSIMAL 15 CEKLIS PER BARIS & BEBAS DESKRIPSI) */
                                          (!crit.tipe || crit.tipe === 'checkbox') ? (() => {
                                            // Susun kotak ceklis maksimal 15 per baris (wrap otomatis ke baris berikutnya jika > 15)
                                            const rowsOf15: number[][] = [];
                                            for (let i = 0; i < scaleItems.length; i += 15) {
                                              rowsOf15.push(scaleItems.slice(i, i + 15));
                                            }

                                            return (
                                              <div className="space-y-1 w-full max-w-full">
                                                {rowsOf15.map((rowChunk, rIdx) => (
                                                  <div key={rIdx} className="flex flex-wrap items-center gap-1 w-full max-w-full break-words [word-break:break-word] [overflow-wrap:anywhere]">
                                                    {rowChunk.map((boxNum) => {
                                                      // Centang kotak poin hanya disesuaikan dengan capaian yang ada
                                                      const isChecked = includeFilledScores && itemNilai ? itemNilai.nilai === boxNum : false;
                                                      return (
                                                        <div
                                                          key={boxNum}
                                                          className={`inline-flex items-center justify-center min-w-[22px] sm:min-w-[24px] h-6 sm:h-6.5 px-1 rounded text-[9.5px] sm:text-[10.5px] font-mono font-bold border shrink-0 transition-all ${
                                                            isChecked
                                                              ? 'bg-amber-100 border-amber-600 text-amber-950 font-black shadow-xs ring-1 ring-amber-500/50'
                                                              : 'bg-white border-stone-300 text-stone-800'
                                                          }`}
                                                        >
                                                          <span>{boxNum}</span>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })() : crit.tipe === 'toggle' ? (
                                            /* Tipe Toggle: HANYA tampilkan kotak capaian nilai bersih tanpa deskripsi tambahan */
                                            <div className="flex flex-wrap items-center gap-1 w-full max-w-full">
                                              <div
                                                className={`inline-flex items-center justify-center min-w-[22px] sm:min-w-[24px] h-6 sm:h-6.5 px-2 rounded text-[9.5px] sm:text-[10.5px] font-mono font-bold border transition-all ${
                                                  includeFilledScores && itemNilai && itemNilai.nilai > 0
                                                    ? 'bg-amber-100 border-amber-600 text-amber-950 font-black shadow-xs ring-1 ring-amber-500/50'
                                                    : 'bg-white border-stone-300 text-stone-800'
                                                }`}
                                              >
                                                <span>{crit.bobotNilai || crit.nilaiMaksimal}</span>
                                              </div>
                                            </div>
                                          ) : crit.tipe === 'kelipatan' ? (() => {
                                            // Susun kelipatan maksimal 15 per baris
                                            const kelipatanItems = Array.from(
                                              { length: Math.floor(crit.nilaiMaksimal / (crit.kelipatan || 5)) + 1 },
                                              (_, i) => i * (crit.kelipatan || 5)
                                            );
                                            const kelipatanRowsOf15: number[][] = [];
                                            for (let i = 0; i < kelipatanItems.length; i += 15) {
                                              kelipatanRowsOf15.push(kelipatanItems.slice(i, i + 15));
                                            }

                                            return (
                                              <div className="space-y-1 w-full max-w-full">
                                                {kelipatanRowsOf15.map((rowChunk, rIdx) => (
                                                  <div key={rIdx} className="flex flex-wrap items-center gap-1 w-full max-w-full break-words [word-break:break-word] [overflow-wrap:anywhere]">
                                                    {rowChunk.map((stepVal) => {
                                                      const isSelected = includeFilledScores && itemNilai ? itemNilai.nilai === stepVal : false;
                                                      return (
                                                        <div
                                                          key={stepVal}
                                                          className={`inline-flex items-center justify-center min-w-[22px] sm:min-w-[24px] h-6 sm:h-6.5 px-1 rounded text-[9.5px] sm:text-[10.5px] font-mono font-bold border shrink-0 ${
                                                            isSelected
                                                              ? 'bg-amber-100 border-amber-600 text-amber-950 font-black shadow-xs ring-1 ring-amber-500/50'
                                                              : 'bg-white border-stone-300 text-stone-800'
                                                          }`}
                                                        >
                                                          <span>{stepVal}</span>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          })() : (
                                            <div className="border border-dashed border-stone-300 rounded px-2 py-0.5 bg-stone-50/50 text-center inline-block min-w-[36px]">
                                              <span className="font-mono font-bold text-stone-900 text-[10px]">
                                                {includeFilledScores && itemNilai ? itemNilai.nilai : '____'}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </td>

                                       {/* Kolom 4: Nilai Total Akumulasi (Akumulasi) atau Nilai Angka (Standar) - Kompak & Minimalis */}
                                      <td className="border border-stone-300 p-0.5 sm:p-1 text-center font-mono align-middle bg-stone-50/30 w-10 sm:w-12">
                                        {isAkumulasiBlangko ? (
                                          activeSubs.length > 0 ? (
                                            <div>
                                              <span className="text-xs sm:text-sm font-black text-stone-950">
                                                {critTotalAkumulasi}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-stone-400 font-bold text-xs">0</span>
                                          )
                                        ) : includeFilledScores && itemNilai ? (
                                          <span className="text-[10px] sm:text-xs font-black text-stone-950">{itemNilai.nilai}</span>
                                        ) : (
                                          <span className="text-stone-400 text-[9px]">____</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Baris Rekapitulasi Total Poin (Disesuaikan tanpa Kolom Max Poin) */}
                                <tr className="bg-stone-100 font-bold text-stone-900">
                                  <td colSpan={2} className="border border-stone-300 p-1.5 text-right break-words [word-break:break-word]">
                                    {isAkumulasiBlangko ? 'Total Akumulasi:' : 'Total Poin:'}
                                  </td>
                                  <td className="border border-stone-300 p-1.5 text-left text-[9px] text-stone-500 italic">
                                    {isAkumulasiBlangko
                                      ? `*Hasil rekapitulasi nilai akumulasi sah seluruh dewan juri (${activeSubs.length} juri bertugas)`
                                      : '*Total akumulasi perolehan poin kriteria'}
                                  </td>
                                  <td className="border border-stone-300 p-1 text-center font-mono text-xs sm:text-sm font-black text-stone-950 bg-amber-50">
                                    {isAkumulasiBlangko
                                      ? activeSubs.length > 0 ? totalAkumulasi : '0'
                                      : includeFilledScores && specificSub ? specificSub.totalNilai : '____'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Catatan Juri */}
                            {isAkumulasiBlangko ? (
                              activeSubs.some((s) => s.catatanJuri) && (
                                <div className="bg-stone-50 p-2 rounded text-[10px] text-stone-700 border border-stone-200 mb-2 space-y-1">
                                  <div className="font-semibold text-stone-800">Catatan Dewan Juri:</div>
                                  {activeSubs.filter((s) => s.catatanJuri).map((s, idx) => (
                                    <div key={idx} className="italic text-[9px] text-stone-600">
                                      • {s.juriNama || `Juri ${idx + 1}`}: "{s.catatanJuri}"
                                    </div>
                                  ))}
                                </div>
                              )
                            ) : (
                              includeFilledScores && specificSub?.catatanJuri && (
                                <div className="bg-stone-50 p-2 rounded text-[10px] text-stone-700 italic border border-stone-200 mb-2 break-words whitespace-normal">
                                  Catatan Juri: "{specificSub.catatanJuri}"
                                </div>
                              )
                            )}

                            {/* Area Tanda Tangan Resmi */}
                            {isAkumulasiBlangko ? (
                              /* Tanda Tangan Mengakomodasi SELURUH Dewan Juri yang Bertugas */
                              <div className="mt-4 pt-3 border-t border-stone-300">
                                <div className="flex justify-between items-center mb-2.5">
                                  <div className="text-[9px] text-stone-500">
                                    <div>No. Register: REG-AKUMULASI-{(selectedMl?.kode || ml.kode)}/PST-{pst.nomorDada}</div>
                                    <div>Dicetak Pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
                                  </div>
                                  <div className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Tanda Tangan Pengesahan Seluruh Dewan Juri</span>
                                  </div>
                                </div>

                                <div className="text-center font-bold text-[10px] text-stone-800 uppercase tracking-wider mb-2.5">
                                  Dewan Juri yang Bertugas Memeriksa & Mengesahkan
                                </div>

                                <div className={`grid gap-2.5 text-center ${
                                  displayedJuris.length <= 2
                                    ? 'grid-cols-2'
                                    : displayedJuris.length === 3
                                      ? 'grid-cols-3'
                                      : 'grid-cols-2 sm:grid-cols-4'
                                }`}>
                                  {displayedJuris.map((juri, jIdx) => {
                                    const judgeSub = allSubmissions.find(
                                      (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id && s.juriId === juri.id
                                    );
                                    return (
                                      <div
                                        key={juri.id}
                                        className="border border-stone-300 rounded-lg p-2 bg-stone-50/70 flex flex-col justify-between"
                                      >
                                        <div>
                                          <p className="text-[9px] font-bold text-stone-800 mb-0.5">
                                            Dewan Juri {jIdx + 1}
                                          </p>
                                          <p className="text-[8px] text-stone-500 mb-2 truncate">
                                            {ml.nama}
                                          </p>
                                        </div>

                                        {judgeSub?.tandaTanganUrl ? (
                                          <img
                                            src={judgeSub.tandaTanganUrl}
                                            alt={`TTD ${juri.name}`}
                                            className="h-10 max-w-[120px] object-contain mx-auto border-b border-stone-600 mb-1"
                                          />
                                        ) : (
                                          <div className="h-10 flex items-end justify-center mb-1">
                                            <div className="w-24 border-b border-stone-800" />
                                          </div>
                                        )}

                                        <div>
                                          <p className="text-[9px] font-bold text-stone-900 truncate">
                                            {juri.name}
                                          </p>
                                          <p className="text-[8px] text-stone-500 font-mono">
                                            ({juri.username})
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              /* Tanda Tangan Blangko Standar / Per Juri */
                              <div className="mt-4 pt-3 border-t border-stone-300 flex justify-between items-end text-xs">
                                <div className="text-[9px] text-stone-500">
                                  <div>No. Register: REG-{(selectedMl?.kode || ml.kode)}/PST-{pst.nomorDada}</div>
                                  <div>Dicetak Pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
                                </div>
                                <div className="text-center min-w-[140px]">
                                  <p className="text-[10px] text-stone-700 font-medium mb-8">
                                    Tanda Tangan Dewan Juri:
                                  </p>
                                  {includeFilledScores && specificSub?.tandaTanganUrl ? (
                                    <img
                                      src={specificSub.tandaTanganUrl}
                                      alt="Tanda Tangan"
                                      className="h-10 max-w-[140px] object-contain mx-auto border-b border-stone-600 mb-1"
                                    />
                                  ) : (
                                    <div className="w-36 border-b border-stone-800 mx-auto mb-1" />
                                  )}
                                  <p className="text-[10px] font-bold text-stone-900">
                                    ({activeJuriUser ? activeJuriUser.name : (specificSub?.juriNama || 'Dewan Juri Penilai')})
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Official Signatures Section (Untuk Dokumen Berita Acara Rekapitulasi) */}
            {currentMode.startsWith('rekapan') && (
              <div className="mt-8 pt-4 border-t border-stone-300 text-center grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-stone-600 mb-12">
                    Mengetahui,<br />
                    <strong>Ketua Dewan Juri</strong>
                  </p>
                  <div className="w-32 border-b border-stone-800 mx-auto" />
                  <p className="text-[9px] text-stone-500 mt-1">( Prof. Dr. Hendra Wijaya, M.Sn )</p>
                </div>

                <div>
                  <p className="text-[10px] text-stone-600 mb-12">
                    Diverifikasi Oleh,<br />
                    <strong>Sekretaris Panitia</strong>
                  </p>
                  <div className="w-32 border-b border-stone-800 mx-auto" />
                  <p className="text-[9px] text-stone-500 mt-1">( Dra. Hj. Siti Aminah, M.Pd )</p>
                </div>

                <div>
                  <p className="text-[10px] text-stone-600 mb-12">
                    Disahkan Pada Tanggal:<br />
                    <strong>{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</strong>
                  </p>
                  <div className="w-32 border-b border-stone-800 mx-auto" />
                  <p className="text-[9px] text-stone-500 mt-1">Koordinator Pelaksana</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

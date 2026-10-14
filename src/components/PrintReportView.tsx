import React, { useRef, useState } from 'react';
import { EventConfig, MataLomba, Peserta, NilaiSubmission, RankingParticipant } from '../types';
import { StorageService } from '../services/storage';
import { soundService } from '../services/sound';
import { Printer, Download, X, Award, ShieldCheck, Clock, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export type PrintModeType =
  | 'rekapan_per_matalomba'
  | 'rekapan_keseluruhan'
  | 'blangko_per_peserta_per_lomba'
  | 'blangko_per_peserta_semua_lomba'
  | 'blangko_semua_peserta_per_lomba'
  | 'blangko_semua_peserta_semua_lomba';

interface PrintReportViewProps {
  mode: PrintModeType;
  selectedMataLombaId?: string;
  selectedPesertaId?: string;
  includeFilledScores?: boolean;
  eventConfig: EventConfig;
  onClose: () => void;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  mode,
  selectedMataLombaId,
  selectedPesertaId,
  includeFilledScores = true,
  eventConfig,
  onClose,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [rekapTab, setRekapTab] = useState<'keduanya' | 'rekapan' | 'hasil_akhir'>('keduanya');

  const allMataLomba = StorageService.getMataLomba();
  const allPeserta = StorageService.getPeserta();
  const allSubmissions = StorageService.getSubmissions();

  const selectedMl = allMataLomba.find((m) => m.id === selectedMataLombaId) || allMataLomba[0];
  const selectedPst = allPeserta.find((p) => p.id === selectedPesertaId);

  // Target Mata Lomba list based on mode
  const targetLombaList = mode.includes('semua_lomba') || mode === 'rekapan_keseluruhan'
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

          pdf.save(`Blangko_Penilaian_${(selectedMl?.kode || 'ALL')}_${Date.now()}.pdf`);
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

      pdf.save(`Laporan_Resmi_${mode}_${Date.now()}.pdf`);
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-stone-950 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-sm">
                Pratinjau Dokumen Cetak & PDF
              </h3>
              <p className="text-[11px] text-stone-400">
                Format Berita Acara & Blangko Penilaian Standar Panitia
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
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
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
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
                  <span>Simpan PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handleNativePrint}
              disabled={isExporting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer ml-1 sm:ml-2"
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
                {mode.startsWith('rekapan')
                  ? 'BERITA ACARA & REKAPITULASI NILAI DEWAN JURI'
                  : 'LEMBAR FORMULIR PENILAIAN PERLOMBAAN'}
              </h3>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Nomor Register: REG-SP/{(selectedMl?.kode || 'ALL')}/{Date.now().toString().slice(-6)}
              </p>
            </div>

            {/* Loop over target competitions */}
            {targetLombaList.map((ml) => {
              const rankings = StorageService.calculateRanking(ml.id);
              const lombaPeserta = mode.includes('per_peserta') && selectedPst
                ? [selectedPst]
                : allPeserta.filter((p) => p.mataLombaId === ml.id || (Array.isArray(p.mataLombaIds) && p.mataLombaIds.includes(ml.id)));

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

                  {/* Mode Rekapan Table */}
                  {mode.startsWith('rekapan') ? (
                    <table className="w-full border-collapse border border-stone-400 text-[11px] mb-4">
                      <thead>
                        <tr className="bg-stone-200 text-stone-800 font-bold">
                          <th className="border border-stone-400 p-1.5 w-10 text-center">Rank</th>
                          <th className="border border-stone-400 p-1.5 w-12 text-center">No. Dada</th>
                          <th className="border border-stone-400 p-1.5 text-left">Nama Peserta</th>
                          <th className="border border-stone-400 p-1.5 text-left">Asal Instansi</th>
                          <th className="border border-stone-400 p-1.5 w-16 text-center">Waktu</th>
                          <th className="border border-stone-400 p-1.5 w-16 text-center">Jml Juri</th>
                          <th className="border border-stone-400 p-1.5 w-18 text-center">Rata-rata</th>
                          <th className="border border-stone-400 p-1.5 w-28 text-center">Predikat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-3 text-center text-stone-500 border border-stone-400">
                              Belum ada nilai yang diverifikasi panitia.
                            </td>
                          </tr>
                        ) : (
                          rankings.map((r) => (
                            <tr key={r.peserta.id} className="hover:bg-stone-50">
                              <td className="border border-stone-400 p-1.5 text-center font-bold">
                                {r.rank}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-center font-mono">
                                {r.peserta.nomorDada}
                              </td>
                              <td className="border border-stone-400 p-1.5 font-semibold break-words whitespace-normal">
                                {r.peserta.nama}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-stone-700 break-words whitespace-normal">
                                {r.peserta.asalInstansi}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-center font-mono">
                                {formatSeconds(r.rataRataWaktuDetik)}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-center">
                                {r.jumlahJuriMenilai}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-center font-bold text-stone-900">
                                {r.rataRataNilai.toFixed(2)}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-center font-bold text-amber-800">
                                {r.predikatJuara || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="space-y-6">
                      {lombaPeserta.map((pst, pstIdx) => {
                        const sub = allSubmissions.find(
                          (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id
                        );

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
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-stone-100 border border-stone-300 text-stone-700">
                                    LEMBAR BLANGKO PENILAIAN
                                  </span>
                                  <div className="text-[9px] text-stone-500 font-mono mt-0.5">
                                    Mata Lomba: [{ml.kode}] {ml.nama}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-start mb-3 border-b border-stone-200 pb-2 gap-2">
                              <div className="min-w-0 flex-1 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]">
                                <span className="font-bold text-sm text-stone-900 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] block">
                                  {pst.nomorDada} - {pst.nama}
                                </span>
                                <div className="text-[11px] text-stone-600 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]">
                                  {pst.asalInstansi}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-stone-500 block">Waktu Tempuh:</span>
                                <div className="font-mono font-bold text-stone-900">
                                  {sub ? formatSeconds(sub.waktuPengerjaanDetik) : '___ : ___'}
                                </div>
                              </div>
                            </div>

                            {/* Tabel Blangko dengan Kolom Kriteria dan Kolom Ceklis Terpisah Berdampingan */}
                            <table className="w-full border-collapse border border-stone-300 text-[10px] mb-3 table-fixed">
                              <thead>
                                <tr className="bg-stone-100 font-semibold text-stone-800">
                                  <th className="border border-stone-300 p-1.5 w-8 sm:w-10 text-center break-words [word-break:break-word]">
                                    No
                                  </th>
                                  <th className="border border-stone-300 p-1.5 text-left w-[36%] break-words [word-break:break-word]">
                                    Kriteria Penilaian
                                  </th>
                                  <th className="border border-stone-300 p-1.5 text-left w-[38%] break-words [word-break:break-word]">
                                    Kotak Ceklis Penilaian (Skor)
                                  </th>
                                  <th className="border border-stone-300 p-1.5 w-16 sm:w-20 text-center break-words [word-break:break-word]">
                                    Max Poin
                                  </th>
                                  <th className="border border-stone-300 p-1.5 w-20 sm:w-24 text-center break-words [word-break:break-word]">
                                    Nilai Angka
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {ml.kriteriaList.map((crit, idx) => {
                                  const itemNilai = sub?.nilaiKriteria?.find(
                                    (k) => k.kriteriaId === crit.id
                                  );
                                  return (
                                    <tr key={crit.id} className="align-top hover:bg-stone-50/50">
                                      {/* Kolom 1: Nomor */}
                                      <td className="border border-stone-300 p-1.5 text-center font-mono align-middle">
                                        {idx + 1}
                                      </td>

                                      {/* Kolom 2: Kriteria Penilaian */}
                                      <td className="border border-stone-300 p-2 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]">
                                        <div className="font-bold text-stone-900 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere] leading-snug">
                                          {crit.nama}
                                        </div>
                                        {crit.deskripsi && (
                                          <div className="text-stone-600 text-[9px] mt-1 break-words whitespace-pre-line [word-break:break-word] [overflow-wrap:anywhere] leading-relaxed">
                                            {crit.deskripsi}
                                          </div>
                                        )}
                                        <div className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                                          {crit.tipe === 'checkbox' ? 'Format: Ceklis Dinamis' : 'Format: Input Angka'}
                                        </div>
                                      </td>

                                      {/* Kolom 3: Kotak Ceklis Penilaian (Terpisah ke Samping) */}
                                      <td className="border border-stone-300 p-2 break-words whitespace-normal [word-break:break-word] [overflow-wrap:anywhere]">
                                        {crit.tipe === 'checkbox' ? (
                                          <div className="space-y-1.5">
                                            <div className="text-[9px] font-semibold text-stone-700 flex items-center justify-between flex-wrap gap-1">
                                              <span className="text-stone-800 font-bold">
                                                Ceklis Skor (1 s/d {crit.nilaiMaksimal}):
                                              </span>
                                              <span className="text-[8px] text-stone-500 font-normal">
                                                {includeFilledScores && itemNilai
                                                  ? `Tercentang: ${itemNilai.nilai} / ${crit.nilaiMaksimal}`
                                                  : 'Centang kotak yang sesuai'}
                                              </span>
                                            </div>
                                            {/* Container flex-wrap untuk kotak ceklis dengan word-break teratur */}
                                            <div className="flex flex-wrap gap-1 items-center max-w-full break-words [overflow-wrap:anywhere]">
                                              {Array.from({ length: crit.nilaiMaksimal }, (_, i) => i + 1).map((boxNum) => {
                                                const isChecked = Boolean(
                                                  includeFilledScores &&
                                                  itemNilai &&
                                                  ((itemNilai.checkedIndices && itemNilai.checkedIndices.includes(boxNum)) ||
                                                   (!itemNilai.checkedIndices && itemNilai.nilai >= boxNum))
                                                );
                                                return (
                                                  <div
                                                    key={boxNum}
                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono border break-words transition-colors ${
                                                      isChecked
                                                        ? 'bg-amber-100 border-amber-600 text-amber-950 font-bold shadow-xs'
                                                        : 'bg-stone-50 border-stone-300 text-stone-600'
                                                    }`}
                                                  >
                                                    <span className="text-[10px] leading-none font-bold">
                                                      {isChecked ? '☑' : '☐'}
                                                    </span>
                                                    <span>{boxNum}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="py-1">
                                            <div className="text-[9px] text-stone-700 font-medium">
                                              Input Nilai Langsung (0 s/d {crit.nilaiMaksimal} Poin)
                                            </div>
                                            <div className="text-[8px] text-stone-500 italic mt-0.5">
                                              {includeFilledScores && itemNilai
                                                ? `Nilai terinput: ${itemNilai.nilai} Poin`
                                                : 'Isikan nilai angka pada kolom Nilai'}
                                            </div>
                                          </div>
                                        )}
                                      </td>

                                      {/* Kolom 4: Max Poin */}
                                      <td className="border border-stone-300 p-1.5 text-center font-mono font-bold align-middle text-stone-800">
                                        {crit.nilaiMaksimal}
                                      </td>

                                      {/* Kolom 5: Nilai Angka */}
                                      <td className="border border-stone-300 p-1.5 text-center font-bold font-mono align-middle text-stone-900">
                                        {includeFilledScores && itemNilai ? (
                                          <span className="text-sm font-black">{itemNilai.nilai}</span>
                                        ) : (
                                          <span className="text-stone-400">______</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Baris Rekapitulasi Total Poin */}
                                <tr className="bg-stone-100 font-bold text-stone-900">
                                  <td colSpan={3} className="border border-stone-300 p-2 text-right break-words [word-break:break-word]">
                                    Total Poin Penilaian:
                                  </td>
                                  <td className="border border-stone-300 p-2 text-center font-mono font-bold text-stone-800">
                                    {ml.kriteriaList.reduce((acc, c) => acc + (c.nilaiMaksimal || 0), 0)}
                                  </td>
                                  <td className="border border-stone-300 p-2 text-center font-mono text-sm font-black text-stone-950">
                                    {includeFilledScores && sub ? sub.totalNilai : '______'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {includeFilledScores && sub?.catatanJuri && (
                              <div className="bg-stone-50 p-2 rounded text-[10px] text-stone-700 italic border border-stone-200 mb-2 break-words whitespace-normal">
                                Catatan Juri: "{sub.catatanJuri}"
                              </div>
                            )}

                            {/* Baris Tanda Tangan & Pengesahan Lembar Peserta */}
                            <div className="mt-4 pt-3 border-t border-stone-300 flex justify-between items-end text-xs">
                              <div className="text-[9px] text-stone-500">
                                <div>No. Register: REG-{(selectedMl?.kode || ml.kode)}/PST-{pst.nomorDada}</div>
                                <div>Dicetak Pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
                              </div>
                              <div className="text-center min-w-[140px]">
                                <p className="text-[10px] text-stone-700 font-medium mb-8">Tanda Tangan Dewan Juri:</p>
                                {includeFilledScores && sub?.tandaTanganUrl ? (
                                  <img
                                    src={sub.tandaTanganUrl}
                                    alt="Tanda Tangan"
                                    className="h-10 max-w-[140px] object-contain mx-auto border-b border-stone-600 mb-1"
                                  />
                                ) : (
                                  <div className="w-36 border-b border-stone-800 mx-auto mb-1" />
                                )}
                                <p className="text-[10px] font-bold text-stone-900">
                                  ({sub?.juriNama || 'Dewan Juri Penilai'})
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Official Signatures Section (Hanya untuk Dokumen Berita Acara Rekapitulasi) */}
            {mode.startsWith('rekapan') && (
              <div className="mt-8 pt-4 border-t border-stone-300 text-center grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-stone-600 mb-12">
                    Mengetahui,<br />
                    <strong>Ketua Dewan Juri</strong>
                  </p>
                  <div className="w-32 border-b border-stone-800 mx-auto" />
                  <p className="text-[9px] text-stone-500 mt-1">(............................................)</p>
                </div>

                <div>
                  <p className="text-[10px] text-stone-600 mb-12">
                    Diverifikasi Oleh,<br />
                    <strong>Sekretaris Panitia</strong>
                  </p>
                  <div className="w-32 border-b border-stone-800 mx-auto" />
                  <p className="text-[9px] text-stone-500 mt-1">(............................................)</p>
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

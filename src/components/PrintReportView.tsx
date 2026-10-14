import React, { useRef } from 'react';
import { EventConfig, MataLomba, Peserta, NilaiSubmission, RankingParticipant } from '../types';
import { StorageService } from '../services/storage';
import { soundService } from '../services/sound';
import { Printer, Download, X, Award, ShieldCheck, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
    if (!printContentRef.current) return;

    try {
      const element = printContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laporan_Resmi_${mode}_${Date.now()}.pdf`);
      soundService.playSuccessFanfare();
    } catch (err) {
      console.error('Failed to export PDF', err);
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
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Simpan PDF</span>
            </button>
            <button
              onClick={handleNativePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              onClick={() => {
                soundService.playClick();
                onClose();
              }}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-950 flex justify-center">
          <div
            ref={printContentRef}
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-stone-900 p-8 sm:p-12 shadow-2xl rounded-sm print:p-0 print:shadow-none print:m-0 text-xs leading-normal"
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
                              <td className="border border-stone-400 p-1.5 font-semibold">
                                {r.peserta.nama}
                              </td>
                              <td className="border border-stone-400 p-1.5 text-stone-700">
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
                    /* Blangko Lembar Nilai */
                    <div className="space-y-6">
                      {lombaPeserta.map((pst) => {
                        const sub = allSubmissions.find(
                          (s) => s.mataLombaId === ml.id && s.pesertaId === pst.id
                        );

                        return (
                          <div key={pst.id} className="border border-stone-300 p-4 rounded mb-4">
                            <div className="flex justify-between items-start mb-3 border-b border-stone-200 pb-2">
                              <div>
                                <span className="font-bold text-sm">
                                  {pst.nomorDada} - {pst.nama}
                                </span>
                                <div className="text-[11px] text-stone-600">
                                  {pst.asalInstansi}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-stone-500">Waktu Tempuh:</span>
                                <div className="font-mono font-bold">
                                  {sub ? formatSeconds(sub.waktuPengerjaanDetik) : '___ : ___'}
                                </div>
                              </div>
                            </div>

                            {/* Kriteria list */}
                            <table className="w-full border-collapse border border-stone-300 text-[10px] mb-3">
                              <thead>
                                <tr className="bg-stone-100 font-semibold">
                                  <th className="border border-stone-300 p-1 w-8 text-center">No</th>
                                  <th className="border border-stone-300 p-1 text-left">Kriteria Penilaian</th>
                                  <th className="border border-stone-300 p-1 w-20 text-center">Max Poin</th>
                                  <th className="border border-stone-300 p-1 w-24 text-center">Nilai Angka</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ml.kriteriaList.map((crit, idx) => {
                                  const itemNilai = sub?.nilaiKriteria?.find(
                                    (k) => k.kriteriaId === crit.id
                                  );
                                  return (
                                    <tr key={crit.id}>
                                      <td className="border border-stone-300 p-1 text-center">{idx + 1}</td>
                                      <td className="border border-stone-300 p-1">
                                        <div className="font-semibold">{crit.nama}</div>
                                        <div className="text-stone-500 text-[9px]">{crit.deskripsi}</div>
                                      </td>
                                      <td className="border border-stone-300 p-1 text-center font-mono">
                                        {crit.nilaiMaksimal}
                                      </td>
                                      <td className="border border-stone-300 p-1 text-center font-bold font-mono">
                                        {includeFilledScores && itemNilai ? itemNilai.nilai : '______'}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-stone-50 font-bold">
                                  <td colSpan={3} className="border border-stone-300 p-1 text-right">
                                    Total Poin:
                                  </td>
                                  <td className="border border-stone-300 p-1 text-center font-mono text-sm">
                                    {includeFilledScores && sub ? sub.totalNilai : '______'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {includeFilledScores && sub?.catatanJuri && (
                              <div className="bg-stone-50 p-2 rounded text-[10px] text-stone-700 italic border border-stone-200 mb-2">
                                Catatan Juri: "{sub.catatanJuri}"
                              </div>
                            )}

                            {includeFilledScores && sub?.tandaTanganUrl && (
                              <div className="flex justify-end items-center gap-2 mt-2">
                                <span className="text-[10px] text-stone-500">Tanda Tangan Juri:</span>
                                <img
                                  src={sub.tandaTanganUrl}
                                  alt="Tanda Tangan"
                                  className="h-8 max-w-[120px] object-contain border-b border-stone-400"
                                />
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

            {/* Official Signatures Section */}
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

          </div>
        </div>

      </div>
    </div>
  );
};

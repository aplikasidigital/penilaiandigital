import React, { useState, useEffect } from 'react';
import {
  Clock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  FileCheck,
  Send,
  PenTool,
  RotateCcw,
  Sparkles,
  Layers,
  LayoutGrid,
  Maximize2,
  Printer
} from 'lucide-react';
import { ItemNilaiKriteria, MataLomba, NilaiSubmission, PelanggaranEntry, Peserta, User } from '../types';
import { StorageService } from '../services/storage';
import { StopwatchTimer } from './StopwatchTimer';
import { DigitalSignaturePad } from './DigitalSignaturePad';
import { PrintReportView } from './PrintReportView';
import { soundService } from '../services/sound';

interface JuriDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const JuriDashboard: React.FC<JuriDashboardProps> = ({ currentUser, onLogout }) => {
  const [allMataLomba, setAllMataLomba] = useState(() => StorageService.getMataLomba());
  const [allPeserta, setAllPeserta] = useState(() => StorageService.getPeserta());
  const [allSubmissions, setAllSubmissions] = useState(() => StorageService.getSubmissions());

  // Sinkronisasi otomatis data secara Real-Time selektif (mencegah re-render yang tidak perlu saat mengetik)
  useEffect(() => {
    const unsub = StorageService.onRemoteChange((type) => {
      if (!type || type === 'all_restored' || type === 'cloud_synced') {
        const nextMl = StorageService.getMataLomba();
        const nextPes = StorageService.getPeserta();
        const nextSubs = StorageService.getSubmissions();
        setAllMataLomba(prev => (JSON.stringify(prev) === JSON.stringify(nextMl) ? prev : nextMl));
        setAllPeserta(prev => (JSON.stringify(prev) === JSON.stringify(nextPes) ? prev : nextPes));
        setAllSubmissions(prev => (JSON.stringify(prev) === JSON.stringify(nextSubs) ? prev : nextSubs));
        return;
      }
      if (type === 'matalomba' || type === 'mata_lomba') {
        const nextMl = StorageService.getMataLomba();
        setAllMataLomba(prev => (JSON.stringify(prev) === JSON.stringify(nextMl) ? prev : nextMl));
      } else if (type === 'peserta') {
        const nextPes = StorageService.getPeserta();
        setAllPeserta(prev => (JSON.stringify(prev) === JSON.stringify(nextPes) ? prev : nextPes));
      } else if (type === 'submissions') {
        const nextSubs = StorageService.getSubmissions();
        setAllSubmissions(prev => (JSON.stringify(prev) === JSON.stringify(nextSubs) ? prev : nextSubs));
      }
    });
    return unsub;
  }, []);

  // Filter mata lomba assigned to this juri
  const assignedLomba = allMataLomba.filter(ml =>
    ml.assignedJuriIds?.includes(currentUser.id) || currentUser.assignedMataLombaIds?.includes(ml.id)
  );

  // Pulihkan pilihan mata lomba & peserta terakhir dari localStorage agar saat refresh tidak kembali ke awal
  const savedLombaId = typeof window !== 'undefined' ? localStorage.getItem('simpel_juri_selected_lomba') : null;
  const initialLomba = allMataLomba.find(m => m.id === savedLombaId) || assignedLomba[0] || allMataLomba[0];

  const [selectedLombaId, setSelectedLombaId] = useState<string>(
    initialLomba?.id || ''
  );
  const [assessmentMode, setAssessmentMode] = useState<'per_peserta' | 'grid_semua'>('per_peserta');

  const currentMl = allMataLomba.find(m => m.id === selectedLombaId) || assignedLomba[0] || allMataLomba[0];
  const participants = allPeserta.filter(
    p => p.mataLombaId === currentMl?.id || (Array.isArray(p.mataLombaIds) && p.mataLombaIds.includes(currentMl?.id))
  );

  // Single participant mode state - dipulihkan dari localStorage
  const savedPesertaId = typeof window !== 'undefined' ? localStorage.getItem('simpel_juri_selected_peserta') : null;
  const initialPeserta = participants.find(p => p.id === savedPesertaId) || participants[0];

  const [selectedPesertaId, setSelectedPesertaId] = useState<string>(initialPeserta?.id || '');
  const activePeserta = participants.find(p => p.id === selectedPesertaId) || participants[0];
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Existing submission for this juri + active participant
  const existingSub = allSubmissions.find(
    s => s.mataLombaId === currentMl?.id && s.pesertaId === activePeserta?.id && s.juriId === currentUser.id
  );

  // Periksa draft tersimpan di localStorage
  const initialDraft = (currentMl && activePeserta)
    ? StorageService.getJuriDraft(currentUser.id, currentMl.id, activePeserta.id)
    : null;

  // Form states
  const [waktuDetik, setWaktuDetik] = useState<number>(() => {
    if (initialDraft?.waktuDetik !== undefined) return initialDraft.waktuDetik;
    return existingSub?.waktuPengerjaanDetik || 0;
  });

  const [scoresMap, setScoresMap] = useState<Record<string, { nilai: number; checkedIndices: number[] }>>(() => {
    if (initialDraft?.scoresMap) return initialDraft.scoresMap;
    const init: Record<string, { nilai: number; checkedIndices: number[] }> = {};
    if (existingSub) {
      existingSub.nilaiKriteria.forEach(k => {
        init[k.kriteriaId] = {
          nilai: k.nilai,
          checkedIndices: k.checkedIndices || [],
        };
      });
    }
    return init;
  });

  const [pelanggaranList, setPelanggaranList] = useState<PelanggaranEntry[]>(
    initialDraft?.pelanggaranList || existingSub?.pelanggaranList || []
  );
  const [newPelanggaranNama, setNewPelanggaranNama] = useState('');
  const [newPelanggaranPoin, setNewPelanggaranPoin] = useState(2);
  const [catatanJuri, setCatatanJuri] = useState(initialDraft?.catatanJuri || existingSub?.catatanJuri || '');
  const [tandaTanganUrl, setTandaTanganUrl] = useState(initialDraft?.tandaTanganUrl || existingSub?.tandaTanganUrl || '');
  const [paktaAgreed, setPaktaAgreed] = useState(initialDraft?.paktaAgreed ?? (existingSub?.paktaIntegritasDisetujui || false));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Auto-Save Effect: Simpan perubahan nilai, waktu, dan catatan juri secara otomatis ke Supabase & LocalStorage
  useEffect(() => {
    if (!currentMl || !activePeserta) return;

    setAutoSaveStatus(prev => (prev === 'saving' ? prev : 'saving'));
    // 1. Simpan seketika ke LocalStorage agar saat refresh browser isian tidak pernah hilang
    StorageService.saveJuriDraft(currentUser.id, currentMl.id, activePeserta.id, {
      scoresMap,
      waktuDetik,
      pelanggaranList,
      catatanJuri,
      tandaTanganUrl,
      paktaAgreed,
    });

    // 2. Debounce auto-save ke Supabase Database secara real-time (800ms aman dari keystroke terus menerus)
    const timer = setTimeout(() => {
      const formattedNilaiKriteria: ItemNilaiKriteria[] = currentMl.kriteriaList.map(crit => ({
        kriteriaId: crit.id,
        nilai: scoresMap[crit.id]?.nilai || 0,
        checkedIndices: scoresMap[crit.id]?.checkedIndices || [],
      }));

      const totalKriteriaNilai = formattedNilaiKriteria.reduce((acc, curr) => acc + curr.nilai, 0);
      const totalPengurangan = pelanggaranList.reduce((acc, curr) => acc + curr.poinPengurangan, 0);
      const finalTotalNilai = Math.max(0, totalKriteriaNilai - totalPengurangan);

      const hasAnyScore = totalKriteriaNilai > 0 || waktuDetik > 0 || pelanggaranList.length > 0 || catatanJuri.trim() !== '';
      if (hasAnyScore) {
        const subToSave: NilaiSubmission = {
          id: existingSub?.id || `sub_${currentUser.id}_${currentMl.id}_${activePeserta.id}`,
          mataLombaId: currentMl.id,
          pesertaId: activePeserta.id,
          juriId: currentUser.id,
          juriNama: currentUser.name,
          waktuPengerjaanDetik: waktuDetik,
          nilaiKriteria: formattedNilaiKriteria,
          pelanggaranList,
          totalPengurangan,
          totalNilai: finalTotalNilai,
          catatanJuri,
          tandaTanganUrl,
          paktaIntegritasDisetujui: paktaAgreed,
          status: existingSub?.status || 'pending',
          createdAt: existingSub?.createdAt || new Date().toISOString(),
        };
        StorageService.addOrUpdateSubmission(subToSave);
      }
      setAutoSaveStatus('saved');
    }, 800);

    return () => clearTimeout(timer);
  }, [scoresMap, waktuDetik, pelanggaranList, catatanJuri, tandaTanganUrl, paktaAgreed, currentMl?.id, activePeserta?.id]);

  // Switch participant handler
  const handleSelectPeserta = (pstId: string) => {
    setSelectedPesertaId(pstId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('simpel_juri_selected_peserta', pstId);
    }
    setSaveSuccessMsg('');
    const sub = allSubmissions.find(
      s => s.mataLombaId === currentMl?.id && s.pesertaId === pstId && s.juriId === currentUser.id
    );
    const draft = currentMl ? StorageService.getJuriDraft(currentUser.id, currentMl.id, pstId) : null;

    if (draft) {
      setWaktuDetik(draft.waktuDetik || 0);
      setScoresMap(draft.scoresMap || {});
      setPelanggaranList(draft.pelanggaranList || []);
      setCatatanJuri(draft.catatanJuri || '');
      setTandaTanganUrl(draft.tandaTanganUrl || '');
      setPaktaAgreed(draft.paktaAgreed || false);
    } else if (sub) {
      setWaktuDetik(sub.waktuPengerjaanDetik);
      const init: Record<string, { nilai: number; checkedIndices: number[] }> = {};
      sub.nilaiKriteria.forEach(k => {
        init[k.kriteriaId] = { nilai: k.nilai, checkedIndices: k.checkedIndices || [] };
      });
      setScoresMap(init);
      setPelanggaranList(sub.pelanggaranList || []);
      setCatatanJuri(sub.catatanJuri || '');
      setTandaTanganUrl(sub.tandaTanganUrl || '');
      setPaktaAgreed(sub.paktaIntegritasDisetujui || false);
    } else {
      setWaktuDetik(0);
      setScoresMap({});
      setPelanggaranList([]);
      setCatatanJuri('');
      setTandaTanganUrl('');
      setPaktaAgreed(false);
    }
  };

  // Auto-Checkboxes / Hierarchical Selection:
  // Ketika juri memilih sebuah tingkat nilai (misal kotak ke-5), maka semua kotak ceklis
  // di bawahnya (1 s/d 5) secara otomatis ikut tercentang (checked).
  // Jika kotak yang sedang menjadi nilai tertinggi diklik ulang, juri dapat mengurangi 1 tingkat
  // atau memilih tingkat yang lebih rendah.
  const handleToggleChecklist = (critId: string, index: number, maxScore: number) => {
    soundService.playClick();
    const current = scoresMap[critId] || { nilai: 0, checkedIndices: [] };
    const currentIndices = [...(current.checkedIndices || [])].sort((a, b) => a - b);
    const maxChecked = currentIndices.length > 0 ? currentIndices[currentIndices.length - 1] : 0;

    let updatedIndices: number[] = [];

    if (maxChecked === index) {
      // Jika kotak tertinggi saat ini diklik kembali, batalkan kotak tersebut (turun 1 level)
      updatedIndices = Array.from({ length: index - 1 }, (_, i) => i + 1);
    } else {
      // Otomatis ceklis semua kotak dari 1 sampai index yang dipilih
      updatedIndices = Array.from({ length: index }, (_, i) => i + 1);
    }

    setScoresMap(prev => ({
      ...prev,
      [critId]: {
        nilai: updatedIndices.length, // total checkboxes checked = score!
        checkedIndices: updatedIndices,
      },
    }));
  };

  const handleSetChecklistMax = (critId: string, maxScore: number) => {
    soundService.playClick();
    const allIndices = Array.from({ length: maxScore }, (_, i) => i + 1);
    setScoresMap(prev => ({
      ...prev,
      [critId]: {
        nilai: maxScore,
        checkedIndices: allIndices,
      },
    }));
  };

  const handleResetChecklist = (critId: string) => {
    soundService.playClick();
    setScoresMap(prev => ({
      ...prev,
      [critId]: {
        nilai: 0,
        checkedIndices: [],
      },
    }));
  };

  // Direct number input
  const handleNumberScoreChange = (critId: string, val: number, maxScore: number) => {
    const clamped = Math.max(0, Math.min(maxScore, val));
    setScoresMap(prev => ({
      ...prev,
      [critId]: {
        nilai: clamped,
        checkedIndices: [],
      },
    }));
  };

  // Penalty handlers
  const handleAddPelanggaran = () => {
    if (!newPelanggaranNama.trim()) return;
    soundService.playClick();
    setPelanggaranList(prev => [
      ...prev,
      {
        id: 'p_' + Date.now(),
        nama: newPelanggaranNama.trim(),
        poinPengurangan: Math.max(1, Number(newPelanggaranPoin)),
      },
    ]);
    setNewPelanggaranNama('');
  };

  const handleRemovePelanggaran = (id: string) => {
    soundService.playClick();
    setPelanggaranList(prev => prev.filter(p => p.id !== id));
  };

  // Calculations
  const sumCriteriaScores = currentMl?.kriteriaList.reduce((acc, crit) => {
    return acc + (scoresMap[crit.id]?.nilai || 0);
  }, 0) || 0;

  const totalPengurangan = pelanggaranList.reduce((acc, p) => acc + p.poinPengurangan, 0);
  const finalTotalNilai = Math.max(0, sumCriteriaScores - totalPengurangan);

  // Submit scoring
  const handleSubmitNilai = () => {
    if (!paktaAgreed) {
      alert('Anda wajib menyetujui Pakta Integritas sebelum mengirimkan nilai!');
      return;
    }
    if (!tandaTanganUrl) {
      alert('Mohon bubuhkan tanda tangan digital Anda pada kotak tanda tangan di bawah!');
      return;
    }

    setIsSubmitting(true);
    soundService.playClick();

    const formattedNilaiKriteria: ItemNilaiKriteria[] = currentMl.kriteriaList.map(crit => ({
      kriteriaId: crit.id,
      nilai: scoresMap[crit.id]?.nilai || 0,
      checkedIndices: scoresMap[crit.id]?.checkedIndices || [],
    }));

    const newSub: NilaiSubmission = {
      id: existingSub?.id || 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      mataLombaId: currentMl.id,
      pesertaId: activePeserta.id,
      juriId: currentUser.id,
      juriNama: currentUser.name,
      waktuPengerjaanDetik: waktuDetik,
      nilaiKriteria: formattedNilaiKriteria,
      pelanggaranList,
      totalPengurangan,
      totalNilai: finalTotalNilai,
      catatanJuri,
      tandaTanganUrl,
      paktaIntegritasDisetujui: paktaAgreed,
      status: 'pending', // Pending approval by admin!
      createdAt: existingSub?.createdAt || new Date().toISOString(),
    };

    StorageService.addOrUpdateSubmission(newSub);
    StorageService.clearJuriDraft(currentUser.id, currentMl.id, activePeserta.id);

    setTimeout(() => {
      setIsSubmitting(false);
      setSaveSuccessMsg('Nilai berhasil disimpan dan dikirim ke antrean verifikasi Admin!');
      soundService.playSuccessFanfare();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-stone-950 border-b border-amber-600/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-amber-100 font-display">
                DASHBOARD PENILAIAN JURI
              </h1>
              <span className="bg-amber-900/60 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-600/40 uppercase">
                Dewan Juri Resmi
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Juri: <strong className="text-stone-200">{currentUser.name}</strong> ({currentUser.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indikator Auto-Save Real-Time */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 border border-stone-800">
            <span className={`w-2 h-2 rounded-full ${autoSaveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className={autoSaveStatus === 'saving' ? 'text-amber-300' : 'text-emerald-300'}>
              {autoSaveStatus === 'saving' ? 'Menyimpan...' : 'Auto-Save Aktif (Supabase)'}
            </span>
          </div>

          <button
            onClick={() => {
              soundService.playClick();
              setIsPrintModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer transition-all shadow"
            title="Cetak Blangko / Hasil Penilaian Dewan Juri ke Printer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak ke Printer</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Keluar Akun
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Competition Switcher & Assessment Mode Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-950 p-4 rounded-2xl border border-stone-800">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-stone-400 font-semibold flex-shrink-0">Mata Lomba yang Dinilai:</span>
            {allMataLomba.map(ml => {
              const isAssigned = ml.assignedJuriIds?.includes(currentUser.id);
              return (
                <button
                  key={ml.id}
                  onClick={() => {
                    setSelectedLombaId(ml.id);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('simpel_juri_selected_lomba', ml.id);
                    }
                    const psts = allPeserta.filter(
                      p => p.mataLombaId === ml.id || (Array.isArray(p.mataLombaIds) && p.mataLombaIds.includes(ml.id))
                    );
                    if (psts.length > 0) handleSelectPeserta(psts[0].id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedLombaId === ml.id
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {ml.nama} {isAssigned && '★'}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setAssessmentMode('per_peserta')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                assessmentMode === 'per_peserta'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Mode Per Peserta
            </button>
            <button
              onClick={() => setAssessmentMode('grid_semua')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                assessmentMode === 'grid_semua'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Mode Tabel Keseluruhan
            </button>
          </div>
        </div>

        {/* MODE 1: PER PESERTA (COMPLETE FORM WITH STOPWATCH, CRITERIA, SIGNATURE) */}
        {assessmentMode === 'per_peserta' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Participant Selector List (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                    Daftar Peserta Lomba ({participants.length})
                  </h3>
                  <span className="text-[10px] text-stone-400">Pilih untuk menilai</span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {participants.map(pst => {
                    const sub = allSubmissions.find(
                      s => s.mataLombaId === currentMl?.id && s.pesertaId === pst.id && s.juriId === currentUser.id
                    );
                    const isSelected = activePeserta?.id === pst.id;

                    return (
                      <div
                        key={pst.id}
                        onClick={() => handleSelectPeserta(pst.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/40 text-white'
                            : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-mono font-bold text-amber-400">
                              No. Dada {pst.nomorDada}
                            </span>
                            <h4 className="font-bold text-sm text-stone-100">{pst.nama}</h4>
                            <p className="text-[11px] text-stone-400 truncate max-w-[180px]">
                              {pst.asalInstansi}
                            </p>
                          </div>

                          <div className="text-right">
                            {sub ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.status === 'approved'
                                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40'
                                  : 'bg-amber-900/60 text-amber-300 border border-amber-600/40'
                              }`}>
                                {sub.status === 'approved' ? '✓ Disetujui' : 'Pending'} ({sub.totalNilai} Poin)
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400">
                                Belum dinilai
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Col: Assessment Form Sheet (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {activePeserta ? (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
                  {/* Active Participant Header */}
                  <div className="bg-gradient-to-r from-amber-950/60 via-stone-900 to-stone-950 p-4 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                        NOMOR DADA: {activePeserta.nomorDada}
                      </span>
                      <h2 className="text-xl font-bold text-white mt-1">
                        {activePeserta.nama}
                      </h2>
                      <p className="text-xs text-stone-300">
                        Instansi: {activePeserta.asalInstansi}
                      </p>
                    </div>

                    <div className="text-right bg-stone-900/90 p-3 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block uppercase">Total Nilai Saat Ini:</span>
                      <span className="text-2xl font-mono font-extrabold text-amber-400">
                        {finalTotalNilai}
                      </span>
                      <span className="text-[10px] text-stone-400 block">Poin Bersih</span>
                    </div>
                  </div>

                  {saveSuccessMsg && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {/* 1. Pencatat Waktu Stopwatch (Tie-Breaker) */}
                  <StopwatchTimer
                    initialSeconds={waktuDetik}
                    targetSeconds={currentMl?.durasiTargetDetik || 420}
                    maxMinutes={currentMl?.durasiMaksimalMenit || 10}
                    onTimeChange={setWaktuDetik}
                    label={`Pencatat Waktu: ${currentMl?.nama}`}
                  />

                  {/* 2. Formulir Kriteria Penilaian (Checklist / Number) */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                      <h3 className="font-bold text-sm text-stone-200">
                        Kriteria Penilaian & Indikator
                      </h3>
                      <span className="text-xs text-amber-400 font-mono">
                        Subtotal Kriteria: {sumCriteriaScores} Poin
                      </span>
                    </div>

                    <div className="space-y-4">
                      {currentMl?.kriteriaList.map((crit, idx) => {
                        const currentScore = scoresMap[crit.id] || { nilai: 0, checkedIndices: [] };

                        return (
                          <div
                            key={crit.id}
                            className="bg-stone-900/70 border border-stone-800 rounded-xl p-4 space-y-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-sm text-amber-200">
                                  {idx + 1}. {crit.nama}
                                </h4>
                                <p className="text-xs text-stone-400 mt-0.5">
                                  {crit.deskripsi}
                                </p>
                              </div>
                              <div className="bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800 text-xs font-mono">
                                Nilai: <strong className="text-amber-400">{currentScore.nilai}</strong> / {crit.nilaiMaksimal}
                              </div>
                            </div>

                            {/* Checklist or Number input depending on type */}
                            {crit.tipe === 'checkbox' ? (
                              <div>
                                <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 mb-1.5 gap-2">
                                  <span>
                                    Klik tingkat nilai (otomatis menceklis kotak 1 s/d tingkat yang dipilih):
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSetChecklistMax(crit.id, crit.nilaiMaksimal)}
                                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold cursor-pointer transition-colors"
                                      title="Centang semua kotak hingga nilai maksimal"
                                    >
                                      ✓ Ceklis Semua ({crit.nilaiMaksimal})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResetChecklist(crit.id)}
                                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] cursor-pointer transition-colors"
                                      title="Reset nilai kriteria ini ke 0"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-start items-center text-left">
                                  {Array.from({ length: crit.nilaiMaksimal }, (_, i) => i + 1).map(boxNum => {
                                    const isChecked = currentScore.checkedIndices.includes(boxNum);
                                    return (
                                      <button
                                        key={boxNum}
                                        type="button"
                                        onClick={() => handleToggleChecklist(crit.id, boxNum, crit.nilaiMaksimal)}
                                        title={`Tingkat ${boxNum}: Klik untuk otomatis mencentang kotak 1 s/d ${boxNum}`}
                                        className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border ${
                                          isChecked
                                            ? 'bg-amber-500 border-amber-400 text-stone-950 shadow ring-1 ring-amber-300'
                                            : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:bg-stone-700 hover:text-white'
                                        }`}
                                      >
                                        {isChecked ? '✓' : boxNum}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-stone-300">Input Nilai Angka (0 - {crit.nilaiMaksimal}):</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={crit.nilaiMaksimal}
                                  value={currentScore.nilai || ''}
                                  onChange={e => handleNumberScoreChange(crit.id, parseInt(e.target.value) || 0, crit.nilaiMaksimal)}
                                  className="w-24 px-3 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono text-center text-sm focus:border-amber-500 outline-none"
                                />
                                <span className="text-xs text-stone-400">Poin</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Pengurangan Nilai / Pelanggaran (Penalti) */}
                  <div className="bg-stone-900/60 border border-red-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-red-950 pb-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-red-400">
                        Pencatatan Pelanggaran & Pengurangan Nilai (Penalti)
                      </h4>
                      <span className="text-xs font-mono font-bold text-red-400">
                        -{totalPengurangan} Poin
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Jenis pelanggaran (misal: Kelebihan batas waktu, keluar garis)..."
                        value={newPelanggaranNama}
                        onChange={e => setNewPelanggaranNama(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white outline-none focus:border-red-500"
                      />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={newPelanggaranPoin}
                        onChange={e => setNewPelanggaranPoin(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-2 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs font-mono text-center text-red-400"
                        title="Poin Pengurangan"
                      />
                      <button
                        type="button"
                        onClick={handleAddPelanggaran}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Penalti
                      </button>
                    </div>

                    {pelanggaranList.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {pelanggaranList.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-stone-950 p-2 rounded-lg border border-red-950 text-xs"
                          >
                            <span className="text-stone-300">• {p.nama}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-red-400 font-mono font-bold">-{p.poinPengurangan} Poin</span>
                              <button
                                type="button"
                                onClick={() => handleRemovePelanggaran(p.id)}
                                className="text-stone-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Catatan Evaluasi Juri */}
                  <div>
                    <label className="text-xs text-stone-300 block mb-1.5">
                      Catatan Evaluasi / Masukan Juri:
                    </label>
                    <textarea
                      rows={2}
                      value={catatanJuri}
                      onChange={e => setCatatanJuri(e.target.value)}
                      placeholder="Tuliskan masukan objektif untuk peserta ini..."
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  {/* 5. Tanda Tangan Digital & Pakta Integritas */}
                  <DigitalSignaturePad
                    juriName={currentUser.name}
                    onSignatureChange={(url, pact) => {
                      setTandaTanganUrl(url);
                      setPaktaAgreed(pact);
                    }}
                  />

                  {/* Submit Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-800">
                    <div className="text-xs text-stone-400">
                      Status: <strong className="text-amber-300">{existingSub?.status === 'approved' ? 'Telah Disetujui Admin' : 'Siap Kirim'}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitNilai}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold rounded-xl text-sm shadow-xl cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? 'Mengirim Data...' : 'Kirim Penilaian Resmi ke Admin'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-stone-500">
                  Pilih peserta pada daftar di sebelah kiri untuk mulai menilai.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: GRID / TABEL KESELURUHAN PESERTA */}
        {assessmentMode === 'grid_semua' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">
                  Matriks Penilaian Seluruh Peserta: {currentMl.nama}
                </h3>
                <p className="text-xs text-stone-400">
                  Isi nilai cepat per kriteria untuk semua peserta dalam satu tampilan tabel.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-stone-300 uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="p-3 w-16 text-center">No Dada</th>
                    <th className="p-3">Nama Peserta</th>
                    <th className="p-3 w-28 text-center">Waktu (Detik)</th>
                    {currentMl.kriteriaList.map(crit => (
                      <th key={crit.id} className="p-3 text-center">
                        <div>{crit.nama}</div>
                        <div className="text-[10px] text-amber-400 font-mono">Maks: {crit.nilaiMaksimal}</div>
                      </th>
                    ))}
                    <th className="p-3 text-center w-24">Total Nilai</th>
                    <th className="p-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {participants.map(pst => {
                    const sub = allSubmissions.find(
                      s => s.mataLombaId === currentMl.id && s.pesertaId === pst.id && s.juriId === currentUser.id
                    );

                    return (
                      <tr key={pst.id} className="hover:bg-stone-900/50">
                        <td className="p-3 font-mono font-bold text-amber-400 text-center">
                          {pst.nomorDada}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{pst.nama}</div>
                          <div className="text-[11px] text-stone-400">{pst.asalInstansi}</div>
                        </td>
                        <td className="p-3 text-center font-mono text-stone-300">
                          {sub?.waktuPengerjaanDetik ? `${sub.waktuPengerjaanDetik} dt` : '-'}
                        </td>
                        {currentMl.kriteriaList.map(crit => {
                          const critVal = sub?.nilaiKriteria.find(k => k.kriteriaId === crit.id)?.nilai ?? '-';
                          return (
                            <td key={crit.id} className="p-3 text-center font-mono font-bold text-stone-200">
                              {critVal}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center font-mono font-extrabold text-amber-300 text-sm">
                          {sub ? `${sub.totalNilai} Poin` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              handleSelectPeserta(pst.id);
                              setAssessmentMode('per_peserta');
                            }}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Buka Penilaian
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Cetak Printer Resmi Juri */}
      {isPrintModalOpen && (
        <PrintReportView
          mode="blangko_per_peserta_per_lomba"
          selectedMataLombaId={selectedLombaId}
          selectedPesertaId={selectedPesertaId}
          includeFilledScores={true}
          eventConfig={StorageService.getEventConfig()}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

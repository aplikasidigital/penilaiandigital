import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Settings,
  Printer,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Vote,
  CreditCard,
  Sliders,
  Shield,
  ShieldAlert,
  Save,
  Music,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  PenTool,
  Check,
  Calendar,
  MapPin,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {
  EventConfig,
  KriteriaPenilaian,
  MataLomba,
  NilaiSubmission,
  Peserta,
  TopupRequest,
  User,
  UserRole,
  VotingCategory
} from '../types';
import { StorageService, compressImageFile } from '../services/storage';
import { PrintModeType, PrintReportView } from './PrintReportView';
import { soundService } from '../services/sound';

interface AdminDashboardProps {
  currentUser: User;
  eventConfig: EventConfig;
  onUpdateEventConfig: (cfg: EventConfig) => void;
  onLogout: () => void;
  onViewPublic: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  eventConfig,
  onUpdateEventConfig,
  onLogout,
  onViewPublic,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isShadowAdmin = currentUser.role === 'shadow_admin';

  type AdminTab =
    | 'overview'
    | 'approvals'
    | 'matalomba'
    | 'peserta'
    | 'users'
    | 'dana_topup'
    | 'voting_cat'
    | 'cetak_laporan'
    | 'jadwal_lokasi'
    | 'settings';

  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('simpel_admin_active_tab') as AdminTab) : null;
    return saved || 'overview';
  });

  const activeTabRef = React.useRef(activeTab);
  activeTabRef.current = activeTab;

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    if (tab === 'settings') {
      setLocalConfig(StorageService.getEventConfig());
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('simpel_admin_active_tab', tab);
    }
  };

  // Real-time cached lists
  const [mataLombaList, setMataLombaList] = useState(StorageService.getMataLomba());
  const [pesertaList, setPesertaList] = useState(StorageService.getPeserta());
  const [submissions, setSubmissions] = useState(StorageService.getSubmissions());
  const [usersList, setUsersList] = useState(StorageService.getUsers());
  const [topupList, setTopupList] = useState(StorageService.getTopupRequests());
  const [votingCategories, setVotingCategories] = useState(StorageService.getVotingCategories());
  const [localConfig, setLocalConfig] = useState<EventConfig>(eventConfig);

  // Auto-Save Event Config: Setiap kali ada perubahan pengaturan oleh Super Admin, simpan otomatis ke Supabase & LocalStorage
  useEffect(() => {
    if (!isSuperAdmin) return;
    const timer = setTimeout(() => {
      const currentStored = StorageService.getEventConfig();
      if (JSON.stringify(currentStored) !== JSON.stringify(localConfig)) {
        StorageService.saveEventConfig(localConfig);
        onUpdateEventConfig(localConfig);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [localConfig, isSuperAdmin, onUpdateEventConfig]);

  // Sinkronisasi otomatis data secara Real-Time selektif per jenis event (Mencegah re-render massal & typing bug)
  useEffect(() => {
    const unsub = StorageService.onRemoteChange((type) => {
      if (!type || type === 'all_restored' || type === 'cloud_synced') {
        const nextMl = StorageService.getMataLomba();
        const nextPes = StorageService.getPeserta();
        const nextSubs = StorageService.getSubmissions();
        const nextUsers = StorageService.getUsers();
        const nextTopup = StorageService.getTopupRequests();
        const nextVc = StorageService.getVotingCategories();

        setMataLombaList(prev => (JSON.stringify(prev) === JSON.stringify(nextMl) ? prev : nextMl));
        setPesertaList(prev => (JSON.stringify(prev) === JSON.stringify(nextPes) ? prev : nextPes));
        setSubmissions(prev => (JSON.stringify(prev) === JSON.stringify(nextSubs) ? prev : nextSubs));
        setUsersList(prev => (JSON.stringify(prev) === JSON.stringify(nextUsers) ? prev : nextUsers));
        setTopupList(prev => (JSON.stringify(prev) === JSON.stringify(nextTopup) ? prev : nextTopup));
        setVotingCategories(prev => (JSON.stringify(prev) === JSON.stringify(nextVc) ? prev : nextVc));
        if (activeTabRef.current !== 'settings') {
          const nextCfg = StorageService.getEventConfig();
          setLocalConfig(prev => (JSON.stringify(prev) === JSON.stringify(nextCfg) ? prev : nextCfg));
        }
        return;
      }

      if (type === 'matalomba' || type === 'mata_lomba') {
        const next = StorageService.getMataLomba();
        setMataLombaList(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } else if (type === 'peserta') {
        const next = StorageService.getPeserta();
        setPesertaList(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } else if (type === 'submissions') {
        const next = StorageService.getSubmissions();
        setSubmissions(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } else if (type === 'users') {
        const next = StorageService.getUsers();
        setUsersList(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } else if (type === 'topup_requests') {
        const next = StorageService.getTopupRequests();
        setTopupList(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } else if (type === 'voting_categories') {
        const next = StorageService.getVotingCategories();
        setVotingCategories(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } else if (type === 'event_config') {
        // Jangan timpa input teks jika admin sedang aktif berada di tab pengaturan
        if (activeTabRef.current !== 'settings') {
          const next = StorageService.getEventConfig();
          setLocalConfig(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        }
      }
    });
    return unsub;
  }, []);

  // Password visibility map for users table
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Audio preview playing state
  const [isAudioPreviewPlaying, setIsAudioPreviewPlaying] = useState(false);

  // Print view modal states
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<PrintModeType>('rekapan_per_matalomba');
  const [printSelectedMl, setPrintSelectedMl] = useState<string>(mataLombaList[0]?.id || '');
  const [printSelectedPst, setPrintSelectedPst] = useState<string>('');
  const [printIncludeFilled, setPrintIncludeFilled] = useState(false);

  // Proof inspection modal
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Submissions inspector modal
  const [inspectingSub, setInspectingSub] = useState<NilaiSubmission | null>(null);

  // ----------------- MODAL DIALOG STATES -----------------
  // 1. Submission Modals (Edit & Reject)
  const [editingSub, setEditingSub] = useState<NilaiSubmission | null>(null);
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Perlu peninjauan ulang nilai oleh juri.');

  // 2. Mata Lomba Modal (Create & Edit)
  const [mataLombaModalOpen, setMataLombaModalOpen] = useState(false);
  const [editingMl, setEditingMl] = useState<MataLomba | null>(null);
  const [mlFormData, setMlFormData] = useState<{
    id?: string;
    kode: string;
    nama: string;
    kategori: string;
    deskripsi: string;
    lokasi: string;
    jadwal: string;
    durasiTargetDetik: number;
    durasiMaksimalMenit: number;
    assignedJuriIds: string[];
  }>({
    kode: '',
    nama: '',
    kategori: 'Umum',
    deskripsi: '',
    lokasi: 'Panggung Utama',
    jadwal: 'Sabtu, 24 Okt 2026 - 09:00 WIB',
    durasiTargetDetik: 420,
    durasiMaksimalMenit: 10,
    assignedJuriIds: [],
  });

  // 3. Kriteria Modal (Create & Edit)
  const [kriteriaModalOpen, setKriteriaModalOpen] = useState(false);
  const [targetMlForKriteria, setTargetMlForKriteria] = useState<string>('');
  const [editingKriteria, setEditingKriteria] = useState<KriteriaPenilaian | null>(null);
  const [kriteriaFormData, setKriteriaFormData] = useState<{
    id?: string;
    nama: string;
    deskripsi: string;
    tipe: 'checkbox' | 'number';
    nilaiMaksimal: number;
  }>({
    nama: '',
    deskripsi: '',
    tipe: 'checkbox',
    nilaiMaksimal: 10,
  });

  // 4. Peserta Modal (Create & Edit)
  const [pesertaModalOpen, setPesertaModalOpen] = useState(false);
  const [editingPeserta, setEditingPeserta] = useState<Peserta | null>(null);
  const [pesertaFormData, setPesertaFormData] = useState<{
    id?: string;
    nomorUrut: number;
    nomorDada: string;
    nama: string;
    asalInstansi: string;
    mataLombaId: string;
    mataLombaIds: string[];
    kategori: string;
  }>({
    nomorUrut: 1,
    nomorDada: '',
    nama: '',
    asalInstansi: '',
    mataLombaId: '',
    mataLombaIds: [],
    kategori: 'Nasional',
  });

  // 5. User Modal (Create & Edit)
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<{
    id?: string;
    name: string;
    username: string;
    password: string;
    role: UserRole;
    phone: string;
    voteBalance: number;
    assignedMataLombaIds: string[];
  }>({
    name: '',
    username: '',
    password: '',
    role: 'juri',
    phone: '',
    voteBalance: 0,
    assignedMataLombaIds: [],
  });

  // 6. Top-Up DANA Modal (Edit)
  const [editingTopup, setEditingTopup] = useState<TopupRequest | null>(null);
  const [topupFormData, setTopupFormData] = useState<{
    jumlahVote: number;
    hargaTotal: number;
    pengirimNama: string;
    pengirimNomorHp: string;
    status: 'pending' | 'approved' | 'rejected';
    catatanAdmin: string;
  }>({
    jumlahVote: 10,
    hargaTotal: 50000,
    pengirimNama: '',
    pengirimNomorHp: '',
    status: 'pending',
    catatanAdmin: '',
  });
  const [rejectingTopupId, setRejectingTopupId] = useState<string | null>(null);
  const [rejectingTopupReason, setRejectingTopupReason] = useState<string>('Bukti transfer tidak valid atau dana belum masuk ke akun DANA panitia.');

  // 7. Voting Category Modal (Create & Edit)
  const [votingCatModalOpen, setVotingCatModalOpen] = useState(false);
  const [editingVotingCat, setEditingVotingCat] = useState<VotingCategory | null>(null);
  const [votingCatFormData, setVotingCatFormData] = useState<{
    nama: string;
    deskripsi: string;
    hargaPerVote: number;
    mataLombaId: string;
    isActive: boolean;
  }>({
    nama: '',
    deskripsi: '',
    hargaPerVote: 5000,
    mataLombaId: '',
    isActive: true,
  });

  // In-UI Confirmation Modal state for reliable and responsive deletion & clear actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmStyle?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    confirmStyle: 'danger',
    onConfirm: () => {},
  });

  const openConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Ya, Hapus Data',
    confirmStyle: 'danger' | 'warning' | 'primary' = 'danger'
  ) => {
    soundService.playClick();
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      confirmStyle,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Notification / Alert banner
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlertBanner({ type, msg });
    setTimeout(() => setAlertBanner(null), 4000);
  };

  const reloadData = () => {
    setMataLombaList(StorageService.getMataLomba());
    setPesertaList(StorageService.getPeserta());
    setSubmissions(StorageService.getSubmissions());
    setUsersList(StorageService.getUsers());
    setTopupList(StorageService.getTopupRequests());
    setVotingCategories(StorageService.getVotingCategories());
    setLocalConfig(StorageService.getEventConfig());
  };

  // ----------------- APPROVAL & EDIT PENILAIAN JURI -----------------
  const handleApproveSubmission = (subId: string) => {
    soundService.playClick();
    const list = StorageService.getSubmissions();
    const sub = list.find(s => s.id === subId);
    if (!sub) return;
    sub.status = 'approved';
    sub.approvedAt = new Date().toISOString();
    sub.approvedBy = currentUser.username;
    StorageService.saveSubmissions(list);
    setSubmissions(list);
    showAlert('success', `Nilai juri untuk peserta berhasil DISETUJUI dan resmi tampil di Live Score Publik!`);
    soundService.playSuccessFanfare();
  };

  const handleOpenRejectModal = (subId: string) => {
    soundService.playClick();
    setRejectingSubId(subId);
    setRejectReason('Nilai dikembalikan oleh Admin untuk dikoreksi/ditinjau ulang.');
  };

  const handleConfirmReject = () => {
    if (!rejectingSubId) return;
    soundService.playClick();
    const list = StorageService.getSubmissions();
    const sub = list.find(s => s.id === rejectingSubId);
    if (sub) {
      sub.status = 'rejected';
      sub.adminNotes = rejectReason.trim() || 'Nilai ditolak oleh admin.';
      StorageService.saveSubmissions(list);
      setSubmissions(list);
      showAlert('error', `Nilai juri berhasil DIKEMBALIKAN / DITOLAK: "${sub.adminNotes}"`);
    }
    setRejectingSubId(null);
  };

  const handleBulkApprove = () => {
    soundService.playClick();
    const list = StorageService.getSubmissions();
    let count = 0;
    list.forEach(s => {
      if (s.status === 'pending') {
        s.status = 'approved';
        s.approvedAt = new Date().toISOString();
        s.approvedBy = currentUser.username;
        count++;
      }
    });
    StorageService.saveSubmissions(list);
    setSubmissions(list);
    showAlert('success', `Berhasil menyetujui ${count} berkas nilai juri sekaligus!`);
    soundService.playSuccessFanfare();
  };

  const handleOpenEditSubmission = (sub: NilaiSubmission) => {
    soundService.playClick();
    setEditingSub({ ...sub });
  };

  const handleSaveEditedSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    soundService.playClick();

    StorageService.addOrUpdateSubmission(editingSub);
    setSubmissions(StorageService.getSubmissions());
    showAlert('success', `Data penilaian juri berhasil diperbarui!`);
    setEditingSub(null);
  };

  const handleDeleteSubmission = (subId: string) => {
    openConfirmDialog(
      'Hapus Berkas Penilaian Juri',
      'Apakah Anda yakin ingin menghapus data penilaian juri ini? Data penilaian yang telah disahkan atau pending akan terhapus.',
      () => {
        StorageService.deleteSubmission(subId);
        setSubmissions(StorageService.getSubmissions());
        showAlert('error', 'Data penilaian juri telah dihapus.');
      }
    );
  };

  // ----------------- MATA LOMBA CRUD -----------------
  const handleOpenCreateMl = () => {
    soundService.playClick();
    setEditingMl(null);
    setMlFormData({
      kode: 'ML-' + (mataLombaList.length + 1).toString().padStart(2, '0'),
      nama: '',
      kategori: 'Umum',
      deskripsi: '',
      lokasi: 'Panggung Utama',
      jadwal: 'Sabtu, 24 Okt 2026 - 09:00 WIB',
      durasiTargetDetik: 420,
      durasiMaksimalMenit: 10,
      assignedJuriIds: usersList.filter(u => u.role === 'juri').map(u => u.id),
    });
    setMataLombaModalOpen(true);
  };

  const handleOpenEditMl = (ml: MataLomba) => {
    soundService.playClick();
    setEditingMl(ml);
    setMlFormData({
      id: ml.id,
      kode: ml.kode,
      nama: ml.nama,
      kategori: ml.kategori || '',
      deskripsi: ml.deskripsi || '',
      lokasi: ml.lokasi || '',
      jadwal: ml.jadwal || '',
      durasiTargetDetik: ml.durasiTargetDetik,
      durasiMaksimalMenit: ml.durasiMaksimalMenit,
      assignedJuriIds: ml.assignedJuriIds || [],
    });
    setMataLombaModalOpen(true);
  };

  const handleSaveMataLomba = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mlFormData.nama.trim() || !mlFormData.kode.trim()) {
      alert('Kode dan Nama Mata Lomba wajib diisi.');
      return;
    }
    soundService.playClick();

    if (editingMl) {
      const updated: MataLomba = {
        ...editingMl,
        ...mlFormData,
      };
      StorageService.updateMataLomba(updated);
      showAlert('success', `Mata lomba "${updated.nama}" berhasil diperbarui!`);
    } else {
      const newMl: MataLomba = {
        id: 'ml_' + Date.now(),
        ...mlFormData,
        kriteriaList: [
          {
            id: 'crit_' + Date.now() + '_1',
            mataLombaId: 'ml_' + Date.now(),
            nama: 'Kriteria Utama & Penguasaan Materi',
            deskripsi: 'Indikator penilaian utama',
            tipe: 'checkbox',
            nilaiMaksimal: 10,
          },
        ],
      };
      StorageService.updateMataLomba(newMl);
      showAlert('success', `Mata lomba "${newMl.nama}" berhasil ditambahkan!`);
    }

    setMataLombaList(StorageService.getMataLomba());
    setMataLombaModalOpen(false);
  };

  const handleDeleteMataLomba = (mlId: string, nama: string) => {
    openConfirmDialog(
      'Hapus Mata Lomba',
      `Apakah Anda yakin ingin menghapus mata lomba "${nama}" beserta seluruh kriteria dan data terkait?`,
      () => {
        StorageService.deleteMataLomba(mlId);
        setMataLombaList(StorageService.getMataLomba());
        showAlert('error', `Mata lomba "${nama}" telah dihapus.`);
      }
    );
  };

  // ----------------- KRITERIA PENILAIAN CRUD -----------------
  const handleOpenAddKriteria = (mlId: string) => {
    soundService.playClick();
    setTargetMlForKriteria(mlId);
    setEditingKriteria(null);
    setKriteriaFormData({
      nama: '',
      deskripsi: '',
      tipe: 'checkbox',
      nilaiMaksimal: 10,
    });
    setKriteriaModalOpen(true);
  };

  const handleOpenEditKriteria = (mlId: string, crit: KriteriaPenilaian) => {
    soundService.playClick();
    setTargetMlForKriteria(mlId);
    setEditingKriteria(crit);
    setKriteriaFormData({
      id: crit.id,
      nama: crit.nama,
      deskripsi: crit.deskripsi,
      tipe: crit.tipe,
      nilaiMaksimal: crit.nilaiMaksimal,
    });
    setKriteriaModalOpen(true);
  };

  const handleSaveKriteria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kriteriaFormData.nama.trim()) {
      alert('Nama Kriteria Penilaian wajib diisi.');
      return;
    }
    soundService.playClick();

    const allMl = StorageService.getMataLomba();
    const targetMl = allMl.find(m => m.id === targetMlForKriteria);
    if (!targetMl) return;

    if (editingKriteria) {
      targetMl.kriteriaList = targetMl.kriteriaList.map(c =>
        c.id === editingKriteria.id
          ? {
              ...c,
              nama: kriteriaFormData.nama.trim(),
              deskripsi: kriteriaFormData.deskripsi.trim(),
              tipe: kriteriaFormData.tipe,
              nilaiMaksimal: Number(kriteriaFormData.nilaiMaksimal) || 10,
            }
          : c
      );
      showAlert('success', `Kriteria "${kriteriaFormData.nama}" berhasil diperbarui!`);
    } else {
      const newCrit: KriteriaPenilaian = {
        id: 'crit_' + Date.now(),
        mataLombaId: targetMl.id,
        nama: kriteriaFormData.nama.trim(),
        deskripsi: kriteriaFormData.deskripsi.trim(),
        tipe: kriteriaFormData.tipe,
        nilaiMaksimal: Number(kriteriaFormData.nilaiMaksimal) || 10,
      };
      targetMl.kriteriaList.push(newCrit);
      showAlert('success', `Kriteria "${newCrit.nama}" berhasil ditambahkan!`);
    }

    StorageService.saveMataLomba(allMl);
    setMataLombaList(allMl);
    setKriteriaModalOpen(false);
  };

  const handleDeleteKriteria = (mlId: string, critId: string, nama: string) => {
    openConfirmDialog(
      'Hapus Kriteria Penilaian',
      `Hapus kriteria penilaian "${nama}" dari cabang lomba ini?`,
      () => {
        const allMl = StorageService.getMataLomba();
        const targetMl = allMl.find(m => m.id === mlId);
        if (targetMl) {
          targetMl.kriteriaList = targetMl.kriteriaList.filter(c => c.id !== critId);
          StorageService.saveMataLomba(allMl);
          setMataLombaList(allMl);
          showAlert('error', `Kriteria "${nama}" dihapus.`);
        }
      }
    );
  };

  // ----------------- PESERTA CRUD -----------------
  const handleOpenCreatePeserta = () => {
    soundService.playClick();
    setEditingPeserta(null);
    const defaultMl = mataLombaList[0]?.id || '';
    setPesertaFormData({
      nomorUrut: pesertaList.length + 1,
      nomorDada: `PD-${(pesertaList.length + 1).toString().padStart(2, '0')}`,
      nama: '',
      asalInstansi: '',
      mataLombaId: defaultMl,
      mataLombaIds: defaultMl ? [defaultMl] : [],
      kategori: 'Nasional',
    });
    setPesertaModalOpen(true);
  };

  const handleOpenEditPeserta = (pst: Peserta) => {
    soundService.playClick();
    setEditingPeserta(pst);
    const initialIds = (pst.mataLombaIds && pst.mataLombaIds.length > 0)
      ? pst.mataLombaIds
      : (pst.mataLombaId ? [pst.mataLombaId] : []);

    setPesertaFormData({
      id: pst.id,
      nomorUrut: pst.nomorUrut,
      nomorDada: pst.nomorDada,
      nama: pst.nama,
      asalInstansi: pst.asalInstansi,
      mataLombaId: initialIds[0] || pst.mataLombaId || '',
      mataLombaIds: initialIds,
      kategori: pst.kategori || 'Nasional',
    });
    setPesertaModalOpen(true);
  };

  const handleSavePeserta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pesertaFormData.nama.trim() || !pesertaFormData.nomorDada.trim()) {
      alert('Nama dan Nomor Dada peserta wajib diisi.');
      return;
    }
    const selectedIds = (pesertaFormData.mataLombaIds && pesertaFormData.mataLombaIds.length > 0)
      ? pesertaFormData.mataLombaIds
      : (pesertaFormData.mataLombaId ? [pesertaFormData.mataLombaId] : []);

    if (selectedIds.length === 0) {
      alert('Pilih minimal satu cabang mata lomba untuk peserta.');
      return;
    }
    soundService.playClick();

    const primaryMataLombaId = selectedIds[0];

    if (editingPeserta) {
      const updated: Peserta = {
        ...editingPeserta,
        ...pesertaFormData,
        mataLombaId: primaryMataLombaId,
        mataLombaIds: selectedIds,
      };
      StorageService.updatePeserta(updated);
      showAlert('success', `Data peserta "${updated.nama}" berhasil diperbarui!`);
    } else {
      const newPst: Peserta = {
        id: 'pst_' + Date.now(),
        ...pesertaFormData,
        mataLombaId: primaryMataLombaId,
        mataLombaIds: selectedIds,
      };
      StorageService.updatePeserta(newPst);
      showAlert('success', `Peserta baru "${newPst.nama}" berhasil ditambahkan!`);
    }

    setPesertaList(StorageService.getPeserta());
    setPesertaModalOpen(false);
  };

  const handleDeletePeserta = (pstId: string, nama: string) => {
    openConfirmDialog(
      'Hapus Data Peserta',
      `Apakah Anda yakin ingin menghapus data peserta "${nama}"? Data nilai dan voting peserta ini juga akan dibersihkan.`,
      () => {
        StorageService.deletePeserta(pstId);
        setPesertaList(StorageService.getPeserta());
        showAlert('error', `Peserta "${nama}" telah dihapus.`);
      }
    );
  };

  // ----------------- USERS CRUD -----------------
  const handleOpenCreateUser = () => {
    soundService.playClick();
    setEditingUser(null);
    setUserFormData({
      name: '',
      username: '',
      password: '',
      role: 'juri',
      phone: '',
      voteBalance: 0,
      assignedMataLombaIds: mataLombaList.map(m => m.id),
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    soundService.playClick();
    setEditingUser(user);
    setUserFormData({
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role,
      phone: user.phone || '',
      voteBalance: user.voteBalance || 0,
      assignedMataLombaIds: user.assignedMataLombaIds || [],
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username.trim() || !userFormData.password.trim() || !userFormData.name.trim()) {
      alert('Nama Lengkap, Username, dan Kata Sandi wajib diisi.');
      return;
    }
    soundService.playClick();

    if (editingUser) {
      const updated: User = {
        ...editingUser,
        ...userFormData,
      };
      StorageService.updateUser(updated);
      showAlert('success', `Akun pengguna "${updated.username}" berhasil diperbarui!`);
    } else {
      // Check duplicate
      const exists = usersList.some(u => u.username.toLowerCase() === userFormData.username.trim().toLowerCase());
      if (exists) {
        alert('Username sudah digunakan. Silakan gunakan username lain.');
        return;
      }

      const newUser: User = {
        id: 'usr_' + Date.now(),
        ...userFormData,
        createdAt: new Date().toISOString(),
      };
      StorageService.updateUser(newUser);
      showAlert('success', `Akun pengguna "${newUser.username}" berhasil dibuat!`);
    }

    setUsersList(StorageService.getUsers());
    setUserModalOpen(false);
  };

  const handleDeleteUser = (userId: string, name: string) => {
    openConfirmDialog(
      'Hapus Akun Pengguna',
      `Apakah Anda yakin ingin menghapus akun pengguna "${name}"? Pengguna tidak akan dapat masuk kembali ke sistem.`,
      () => {
        StorageService.deleteUser(userId);
        setUsersList(StorageService.getUsers());
        showAlert('error', `Pengguna "${name}" dihapus.`);
      }
    );
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // ----------------- TOP-UP DANA CRUD -----------------
  const handleApproveTopup = (reqId: string) => {
    soundService.playClick();
    const topups = StorageService.getTopupRequests();
    const req = topups.find(t => t.id === reqId);
    if (!req) return;

    req.status = 'approved';
    req.approvedAt = new Date().toISOString();

    const users = StorageService.getUsers();
    const voter = users.find(u => u.id === req.voterId);
    if (voter) {
      voter.voteBalance = (voter.voteBalance || 0) + req.jumlahVote;
      StorageService.saveUsers(users);
      setUsersList(users);
    }

    StorageService.saveTopupRequests(topups);
    setTopupList(topups);
    showAlert('success', `Pembelian vote disetujui! Saldo voter ${req.voterNama} bertambah +${req.jumlahVote} suara.`);
    soundService.playSuccessFanfare();
  };

  const handleOpenRejectTopupModal = (reqId: string) => {
    soundService.playClick();
    setRejectingTopupId(reqId);
    setRejectingTopupReason('Bukti transfer tidak valid atau dana belum masuk ke akun DANA panitia.');
  };

  const handleConfirmRejectTopup = () => {
    if (!rejectingTopupId) return;
    soundService.playClick();
    const topups = StorageService.getTopupRequests();
    const req = topups.find(t => t.id === rejectingTopupId);
    if (req) {
      req.status = 'rejected';
      req.catatanAdmin = rejectingTopupReason.trim() || 'Ditolak oleh admin.';
      StorageService.saveTopupRequests(topups);
      setTopupList(topups);
      showAlert('error', `Permohonan top-up DANA dari "${req.voterNama}" telah ditolak/dikembalikan.`);
    }
    setRejectingTopupId(null);
  };

  const handleOpenEditTopup = (req: TopupRequest) => {
    soundService.playClick();
    setEditingTopup(req);
    setTopupFormData({
      jumlahVote: req.jumlahVote,
      hargaTotal: req.hargaTotal,
      pengirimNama: req.pengirimNama,
      pengirimNomorHp: req.pengirimNomorHp || '',
      status: req.status,
      catatanAdmin: req.catatanAdmin || '',
    });
  };

  const handleSaveEditedTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopup) return;
    soundService.playClick();

    const updated: TopupRequest = {
      ...editingTopup,
      ...topupFormData,
    };
    StorageService.updateTopupRequest(updated);
    setTopupList(StorageService.getTopupRequests());
    showAlert('success', 'Data transaksi DANA berhasil diperbarui!');
    setEditingTopup(null);
  };

  const handleDeleteTopup = (reqId: string) => {
    openConfirmDialog(
      'Hapus Riwayat Top-Up DANA',
      'Hapus data permohonan top-up DANA ini secara permanen dari daftar?',
      () => {
        StorageService.deleteTopupRequest(reqId);
        setTopupList(StorageService.getTopupRequests());
        showAlert('error', 'Data top-up DANA dihapus.');
      }
    );
  };

  // ----------------- VOTING CATEGORY CRUD -----------------
  const handleOpenCreateVotingCat = () => {
    soundService.playClick();
    setEditingVotingCat(null);
    setVotingCatFormData({
      nama: '',
      deskripsi: '',
      hargaPerVote: 5000,
      mataLombaId: '',
      isActive: true,
    });
    setVotingCatModalOpen(true);
  };

  const handleOpenEditVotingCat = (cat: VotingCategory) => {
    soundService.playClick();
    setEditingVotingCat(cat);
    setVotingCatFormData({
      nama: cat.nama,
      deskripsi: cat.deskripsi || '',
      hargaPerVote: cat.hargaPerVote,
      mataLombaId: cat.mataLombaId || '',
      isActive: cat.isActive,
    });
    setVotingCatModalOpen(true);
  };

  const handleSaveVotingCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!votingCatFormData.nama.trim()) {
      alert('Nama Kategori Voting wajib diisi.');
      return;
    }
    soundService.playClick();

    if (editingVotingCat) {
      const updated: VotingCategory = {
        ...editingVotingCat,
        ...votingCatFormData,
        hargaPerVote: Number(votingCatFormData.hargaPerVote) || 5000,
      };
      StorageService.updateVotingCategory(updated);
      showAlert('success', `Kategori voting "${updated.nama}" diperbarui!`);
    } else {
      const newCat: VotingCategory = {
        id: 'vote_cat_' + Date.now(),
        ...votingCatFormData,
        hargaPerVote: Number(votingCatFormData.hargaPerVote) || 5000,
      };
      StorageService.updateVotingCategory(newCat);
      showAlert('success', `Kategori voting baru "${newCat.nama}" ditambahkan!`);
    }

    setVotingCategories(StorageService.getVotingCategories());
    setVotingCatModalOpen(false);
  };

  const handleDeleteVotingCat = (catId: string, nama: string) => {
    openConfirmDialog(
      'Hapus Kategori Voting',
      `Hapus kategori voting berbayar "${nama}"? Voting yang telah masuk untuk kategori ini akan terpengaruh.`,
      () => {
        StorageService.deleteVotingCategory(catId);
        setVotingCategories(StorageService.getVotingCategories());
        showAlert('error', `Kategori voting "${nama}" dihapus.`);
      }
    );
  };

  // ----------------- RINGKASAN & MONITOR ACTIONS -----------------
  const handleClearOverviewData = () => {
    openConfirmDialog(
      'Clear Data Rekap Nilai Juri',
      'Apakah Anda yakin ingin mengosongkan seluruh antrean dan rekapan penilaian juri? Tindakan ini akan mengosongkan berkas penilaian.',
      () => {
        StorageService.clearSubmissions();
        setSubmissions([]);
        showAlert('error', 'Semua data antrean dan riwayat penilaian dewan juri telah dibersihkan (Clear Data).');
        soundService.playSuccessFanfare();
      },
      'Ya, Clear Rekap Nilai'
    );
  };

  const handleClearVotingRecords = () => {
    openConfirmDialog(
      'Reset / Clear Data Suara Voting',
      'Apakah Anda yakin ingin menghapus SELURUH riwayat suara voting yang masuk? Total vote di papan peringkat publik dan live count akan di-reset menjadi 0.',
      () => {
        StorageService.clearVoteRecords();
        showAlert('error', 'Seluruh data suara voting berhasil dibersihkan (Reset ke 0).');
        soundService.playSuccessFanfare();
      },
      'Ya, Reset Semua Voting'
    );
  };

  const handleClearDanaTopup = () => {
    openConfirmDialog(
      'Reset / Clear Data Dana Masuk DANA QRIS',
      'Apakah Anda yakin ingin menghapus SELURUH riwayat transaksi dan permohonan top-up DANA QRIS? Total dana masuk dan daftar transaksi akan dikosongkan.',
      () => {
        StorageService.clearTopupRequests();
        setTopupList([]);
        showAlert('error', 'Seluruh data transaksi dan akumulasi dana DANA QRIS berhasil dibersihkan.');
        soundService.playSuccessFanfare();
      },
      'Ya, Reset Data DANA'
    );
  };

  // ----------------- JADWAL & LOKASI CONTROL PANEL -----------------
  const handleSaveJadwalLokasi = (mlId: string, newJadwal: string, newLokasi: string) => {
    soundService.playClick();
    const allMl = StorageService.getMataLomba();
    const ml = allMl.find(m => m.id === mlId);
    if (ml) {
      ml.jadwal = newJadwal;
      ml.lokasi = newLokasi;
      StorageService.saveMataLomba(allMl);
      setMataLombaList(allMl);
      showAlert('success', `Jadwal & Lokasi "${ml.nama}" berhasil disimpan!`);
    }
  };

  const handleClearJadwalLokasi = (mlId: string) => {
    soundService.playClick();
    if (window.confirm('Kosongkan data jadwal dan lokasi untuk cabang lomba ini?')) {
      const allMl = StorageService.getMataLomba();
      const ml = allMl.find(m => m.id === mlId);
      if (ml) {
        ml.jadwal = 'Jadwal belum ditentukan';
        ml.lokasi = 'Lokasi belum ditentukan';
        StorageService.saveMataLomba(allMl);
        setMataLombaList(allMl);
        showAlert('error', `Jadwal & Lokasi "${ml.nama}" telah dikosongkan.`);
      }
    }
  };

  // ----------------- CSV IMPORT & EXPORT -----------------
  const handleDownloadTemplatePeserta = () => {
    soundService.playClick();
    const headers = 'nomorUrut,nomorDada,nama,asalInstansi,mataLombaKode,kategori\n';
    const sample = '1,A-01,Nama Peserta Satu,SMA Garuda,ORASI-01,Nasional\n2,A-02,Nama Peserta Dua,Universitas Bangsa,ORASI-01,Nasional';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_peserta.csv';
    link.click();
  };

  const handleImportPesertaCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length <= 1) {
        alert('File CSV kosong.');
        return;
      }

      const curPeserta = [...StorageService.getPeserta()];
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 4) {
          const [noUrutStr, noDada, nama, asalInstansi, mlKode, kategori] = parts;
          const codes = (mlKode || '').split(/[;/|]/).map(c => c.trim().toLowerCase()).filter(Boolean);
          const matchedMls = mataLombaList.filter(m => codes.includes(m.kode.toLowerCase()));
          const finalMls = matchedMls.length > 0 ? matchedMls : (mataLombaList[0] ? [mataLombaList[0]] : []);
          const finalIds = finalMls.map(m => m.id);

          curPeserta.push({
            id: 'pst_' + Date.now() + '_' + i,
            nomorUrut: parseInt(noUrutStr) || (curPeserta.length + 1),
            nomorDada: noDada || `D-${curPeserta.length + 1}`,
            nama: nama || 'Peserta Impor',
            asalInstansi: asalInstansi || '-',
            mataLombaId: finalIds[0] || mataLombaList[0]?.id || '',
            mataLombaIds: finalIds,
            kategori: kategori || 'Umum',
          });
          count++;
        }
      }

      StorageService.savePeserta(curPeserta);
      setPesertaList(curPeserta);
      showAlert('success', `Berhasil mengimpor ${count} peserta baru dari CSV!`);
      soundService.playSuccessFanfare();
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplateUsers = () => {
    soundService.playClick();
    const headers = 'username,password,name,role,phone\n';
    const sample = 'juri_tamu,juri123,Prof. Tamu Penilai,juri,0812345678\nvoter_baru,voter123,Siswa Pemilih,voter,0819876543';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_pengguna.csv';
    link.click();
  };

  const handleImportUsersCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length <= 1) {
        alert('File CSV pengguna kosong.');
        return;
      }

      const curUsers = [...StorageService.getUsers()];
      let count = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 4) {
          const [uname, pass, name, roleStr, phone] = parts;
          const role = (roleStr === 'juri' || roleStr === 'voter' || roleStr === 'shadow_admin') ? roleStr : 'voter';

          if (!curUsers.some(u => u.username.toLowerCase() === uname.toLowerCase())) {
            curUsers.push({
              id: 'usr_' + Date.now() + '_' + i,
              username: uname,
              password: pass || '123456',
              name: name || uname,
              role: role as any,
              phone: phone || '',
              assignedMataLombaIds: role === 'juri' ? mataLombaList.map(m => m.id) : undefined,
              voteBalance: role === 'voter' ? 0 : undefined,
              createdAt: new Date().toISOString(),
            });
            count++;
          }
        }
      }

      StorageService.saveUsers(curUsers);
      setUsersList(curUsers);
      showAlert('success', `Berhasil mengimpor ${count} pengguna baru dari CSV!`);
      soundService.playSuccessFanfare();
    };
    reader.readAsText(file);
  };

  // ----------------- CONFIG & MULTIMEDIA UPLOAD (SUPER ADMIN) -----------------
  const handleSaveConfig = () => {
    if (!isSuperAdmin) {
      alert('Peringatan: Admin Bayangan tidak memiliki hak untuk mengubah konfigurasi!');
      return;
    }
    soundService.playClick();
    StorageService.saveEventConfig(localConfig);
    onUpdateEventConfig(localConfig);
    showAlert('success', 'Pengaturan sistem & parameter kegiatan berhasil disimpan!');
    soundService.playSuccessFanfare();
  };

  const handleToggleVotingClosed = () => {
    if (!isSuperAdmin) {
      alert('Hanya Admin Utama yang dapat mengubah penutupan voting!');
      return;
    }
    const updated = { ...localConfig, votingClosed: !localConfig.votingClosed };
    setLocalConfig(updated);
    StorageService.saveEventConfig(updated);
    onUpdateEventConfig(updated);
    showAlert(updated.votingClosed ? 'error' : 'success', `Voting sekarang: ${updated.votingClosed ? 'DITUTUP' : 'DIBUKA'}`);
    soundService.playClick();
  };

  const handleToggleDanaTransfer = () => {
    if (!isSuperAdmin) {
      alert('Hanya Admin Utama yang dapat mengubah transfer dana!');
      return;
    }
    const updated = { ...localConfig, danaTransferDisabled: !localConfig.danaTransferDisabled };
    setLocalConfig(updated);
    StorageService.saveEventConfig(updated);
    onUpdateEventConfig(updated);
    showAlert(updated.danaTransferDisabled ? 'error' : 'success', `Layanan Transfer DANA: ${updated.danaTransferDisabled ? 'DINONAKTIFKAN' : 'DIAKTIFKAN'}`);
    soundService.playClick();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.9);
      if (compressed) {
        const updated = { ...localConfig, logoUrl: compressed };
        setLocalConfig(updated);
        StorageService.saveEventConfig(updated);
        onUpdateEventConfig(updated);
        showAlert('success', 'Foto profil / logo resmi kegiatan berhasil diperbarui dan disimpan!');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      showAlert('error', 'Gagal memproses gambar foto profil. Coba gunakan format JPG/PNG lain.');
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1920, 1080, 0.82);
      if (compressed) {
        const updated = { ...localConfig, backgroundUrl: compressed };
        setLocalConfig(updated);
        StorageService.saveEventConfig(updated);
        onUpdateEventConfig(updated);
        showAlert('success', 'Gambar latar belakang (background) aplikasi berhasil diperbarui secara dinamis!');
      }
    } catch (err) {
      console.error('Background upload error:', err);
      showAlert('error', 'Gagal memproses gambar latar belakang. Coba gunakan gambar lain.');
    }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1000, 1000, 0.9);
      if (compressed) {
        const updated = { ...localConfig, qrisImageUrl: compressed };
        setLocalConfig(updated);
        StorageService.saveEventConfig(updated);
        onUpdateEventConfig(updated);
        showAlert('success', 'Gambar Kode QRIS DANA berhasil diunggah & disimpan untuk pembelian suara!');
      }
    } catch (err) {
      console.error('QRIS upload error:', err);
      showAlert('error', 'Gagal memproses gambar QRIS. Silakan pilih file gambar lain.');
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = { ...localConfig, bgmAudioUrl: reader.result };
        setLocalConfig(updated);
        StorageService.saveEventConfig(updated);
        onUpdateEventConfig(updated);
        soundService.playCustomAudio(reader.result);
        setIsAudioPreviewPlaying(true);
        showAlert('success', 'File musik latar belakang lokal berhasil dimuat dan diputar!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTestAudioToggle = () => {
    if (isAudioPreviewPlaying) {
      soundService.setMuted(true);
      setIsAudioPreviewPlaying(false);
    } else {
      soundService.setMuted(false);
      soundService.startGlobalBGM(localConfig.bgmAudioUrl || '');
      setIsAudioPreviewPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-stone-950 border-b border-amber-600/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base text-amber-100 font-display">
                PANEL KONTROL S-IMPEL DIGITAL
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                isSuperAdmin
                  ? 'bg-amber-900/60 text-amber-300 border-amber-600/40'
                  : 'bg-blue-900/60 text-blue-300 border-blue-600/40'
              }`}>
                {isSuperAdmin ? 'Super Admin Utama' : 'Admin Bayangan (Co-Admin Operasional)'}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Pengguna: <strong className="text-stone-200">{currentUser.name}</strong> ({currentUser.username})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 border border-stone-800 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Real-Time Sync (Supabase)</span>
          </div>
          <button
            onClick={() => {
              setPrintMode('rekapan_per_matalomba');
              setPrintModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shadow"
            title="Integrasi Cetak: Langsung terhubung ke printer fisik / thermal"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Printer
          </button>
          <button
            onClick={onViewPublic}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Lihat Halaman Publik
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Keluar Akun
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {alertBanner && (
        <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
          alertBanner.type === 'success' ? 'bg-emerald-900/90 text-emerald-100' : 'bg-red-900/90 text-red-100'
        }`}>
          <span>{alertBanner.msg}</span>
          <button onClick={() => setAlertBanner(null)}>✕</button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <nav className="bg-stone-950/70 border-b border-stone-800 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 py-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'overview' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Ringkasan & Monitor
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'approvals' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Approval Nilai Juri
            {submissions.filter(s => s.status === 'pending').length > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {submissions.filter(s => s.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('matalomba')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'matalomba' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Mata Lomba & Kriteria
          </button>

          <button
            onClick={() => setActiveTab('jadwal_lokasi')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'jadwal_lokasi' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Jadwal & Lokasi
          </button>

          <button
            onClick={() => setActiveTab('peserta')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'peserta' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Manajemen Peserta
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'users' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Manajemen Pengguna
          </button>

          <button
            onClick={() => setActiveTab('dana_topup')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'dana_topup' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Verifikasi DANA QRIS
            {topupList.filter(t => t.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-stone-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {topupList.filter(t => t.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('voting_cat')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'voting_cat' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Vote className="w-4 h-4" />
            Kategori Voting
          </button>

          <button
            onClick={() => setActiveTab('cetak_laporan')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'cetak_laporan' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            Cetak PDF Resmi (A4)
          </button>

          {/* Settings Tab - STRICTLY RESTRICTED FOR SHADOW ADMIN */}
          <button
            onClick={() => {
              if (isShadowAdmin) {
                alert('Akses Dibatasi: Admin Bayangan (Shadow Admin) HANYA diizinkan mengoperasikan sistem dan TIDAK BISA mengubah konfigurasi apa pun yang dibuat oleh Admin Utama!');
                return;
              }
              setActiveTab('settings');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-600 text-white shadow'
                : isShadowAdmin
                ? 'text-stone-600 hover:text-stone-500 cursor-not-allowed opacity-60'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title={isShadowAdmin ? 'Terkunci untuk Admin Bayangan' : 'Pengaturan Sistem'}
          >
            <Settings className="w-4 h-4" />
            Pengaturan & Kontrol Fitur
            {isShadowAdmin && <span className="text-[10px] text-red-400 ml-1">🔒</span>}
          </button>
        </div>
      </nav>

      {/* Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: OVERVIEW & LIVE MONITOR */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl shadow">
                <span className="text-xs text-stone-400 block">Total Peserta Terdaftar</span>
                <div className="text-3xl font-extrabold font-mono text-white mt-1">
                  {pesertaList.length}
                </div>
                <div className="text-[11px] text-amber-400 mt-1">
                  Di {mataLombaList.length} cabang mata lomba
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl shadow">
                <span className="text-xs text-stone-400 block">Nilai Juri Approved</span>
                <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                  {submissions.filter(s => s.status === 'approved').length}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  {submissions.filter(s => s.status === 'pending').length} lembar menunggu persetujuan
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl shadow relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-400 block">Total Suara Voting Masuk</span>
                    <button
                      onClick={handleClearVotingRecords}
                      className="text-[10px] text-red-400 hover:text-red-300 bg-red-950/60 hover:bg-red-900 border border-red-800/80 px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                      title="Reset / Clear Data Suara Voting"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Clear Voting
                    </button>
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-amber-400 mt-1">
                    {StorageService.getVoteRecords().reduce((acc, r) => acc + r.jumlahVote, 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  Status: {localConfig.votingClosed ? '🔴 Ditutup' : '🟢 Buka'}
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl shadow relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-stone-400 block">Dana Masuk DANA QRIS</span>
                    <button
                      onClick={handleClearDanaTopup}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                      title="Reset / Clear Data Transaksi DANA QRIS"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Clear DANA
                    </button>
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                    Rp {topupList
                      .filter(t => t.status === 'approved')
                      .reduce((acc, t) => acc + t.hargaTotal, 0)
                      .toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  Akun: {localConfig.nomorDanaAdmin || '081314420312'}
                </div>
              </div>
            </div>

            {/* Quick Action Bar for Overview: Edit, Hapus, Clear Data */}
            <div className="bg-stone-950 border border-stone-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-200">Aksi Panel Ringkasan & Monitor:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    soundService.playClick();
                    setPrintMode('blangko_semua_peserta_per_lomba');
                    setPrintModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 rounded-xl text-xs font-bold cursor-pointer transition-all shadow"
                  title="Buka Menu Cetak Laporan & Hubungkan ke Printer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak / Printer
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    if (isSuperAdmin) {
                      setActiveTab('settings');
                    } else {
                      setActiveTab('matalomba');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-blue-100 rounded-xl text-xs font-bold cursor-pointer transition-all shadow"
                  title="Edit Konfigurasi & Data Lomba"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Data Acara / Lomba
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    const pendingSubs = submissions.filter(s => s.status === 'pending');
                    if (pendingSubs.length === 0) {
                      showAlert('error', 'Tidak ada antrean nilai yang sedang pending.');
                      return;
                    }
                    if (window.confirm(`Hapus seluruh antrean ${pendingSubs.length} lembar nilai juri yang masih pending?`)) {
                      const approvedOnly = submissions.filter(s => s.status !== 'pending');
                      StorageService.saveSubmissions(approvedOnly);
                      setSubmissions(approvedOnly);
                      showAlert('error', `${pendingSubs.length} antrean nilai pending telah dihapus.`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold cursor-pointer transition-all shadow"
                  title="Hapus Seluruh Antrean Nilai Pending"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Antrean Pending
                </button>
                <button
                  onClick={handleClearOverviewData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-extrabold rounded-xl text-xs cursor-pointer transition-all shadow"
                  title="Bersihkan seluruh data rekap nilai juri"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Data Rekap Nilai
                </button>
                <button
                  onClick={handleClearVotingRecords}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow border border-red-700"
                  title="Reset seluruh suara voting masuk menjadi 0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Data Voting
                </button>
                <button
                  onClick={handleClearDanaTopup}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-bold rounded-xl text-xs cursor-pointer transition-all shadow border border-emerald-700"
                  title="Reset seluruh transaksi dan dana masuk DANA QRIS"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Data DANA QRIS
                </button>
              </div>
            </div>

            {/* Quick Feature Toggle Controls Header (Accessible for Super Admin) */}
            {isSuperAdmin && (
              <div className="bg-stone-950 border border-amber-500/40 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    Menu Kontrol Cepat Fitur Sistem (Super Admin)
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Aktifkan atau nonaktifkan fitur sensitif secara langsung.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Toggle Voting */}
                  <div className="flex items-center gap-2 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-300">Penutupan Voting:</span>
                    <button
                      onClick={handleToggleVotingClosed}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        localConfig.votingClosed
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {localConfig.votingClosed ? 'TUTUP (Aktif)' : 'BUKA'}
                    </button>
                  </div>

                  {/* Toggle DANA Transfer */}
                  <div className="flex items-center gap-2 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-300">Transfer DANA:</span>
                    <button
                      onClick={handleToggleDanaTransfer}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        localConfig.danaTransferDisabled
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {localConfig.danaTransferDisabled ? 'NONAKTIF (Dijeda)' : 'AKTIF'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Queue Tables: Pending Approvals & Recent DANA Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Approvals */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-md space-y-3">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Menunggu Persetujuan Skor Juri ({submissions.filter(s => s.status === 'pending').length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Buka Semua →
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {submissions.filter(s => s.status === 'pending').map(sub => {
                    const pst = pesertaList.find(p => p.id === sub.pesertaId);
                    const ml = mataLombaList.find(m => m.id === sub.mataLombaId);

                    return (
                      <div key={sub.id} className="bg-stone-900 p-3 rounded-xl border border-stone-800 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-white">{pst?.nama} ({pst?.nomorDada})</div>
                          <div className="text-[11px] text-stone-400">{ml?.nama} • Juri: {sub.juriNama}</div>
                          <div className="text-[10px] text-stone-500 font-mono">Waktu: {sub.waktuPengerjaanDetik} dt • Total: {sub.totalNilai} Poin</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveSubmission(sub.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(sub.id)}
                            className="px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg text-xs cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {submissions.filter(s => s.status === 'pending').length === 0 && (
                    <div className="p-6 text-center text-xs text-stone-500 italic">
                      Tidak ada antrean nilai juri yang pending.
                    </div>
                  )}
                </div>
              </div>

              {/* Pending DANA Top-Ups */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-md space-y-3">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Menunggu Verifikasi DANA QRIS ({topupList.filter(t => t.status === 'pending').length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('dana_topup')}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Buka Semua →
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {topupList.filter(t => t.status === 'pending').map(topup => (
                    <div key={topup.id} className="bg-stone-900 p-3 rounded-xl border border-stone-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-white">{topup.voterNama}</div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          {topup.jumlahVote} Suara (Rp {topup.hargaTotal.toLocaleString('id-ID')})
                        </div>
                        <div className="text-[10px] text-stone-400">Pengirim DANA: {topup.pengirimNama}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingProofUrl(topup.buktiTransferUrl)}
                          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[11px] cursor-pointer"
                        >
                          Bukti
                        </button>
                        <button
                          onClick={() => handleApproveTopup(topup.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                  {topupList.filter(t => t.status === 'pending').length === 0 && (
                    <div className="p-6 text-center text-xs text-stone-500 italic">
                      Tidak ada antrean top-up DANA yang pending.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: APPROVAL & VERIFIKASI NILAI JURI */}
        {activeTab === 'approvals' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Antrean & Verifikasi Penilaian Dewan Juri
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Admin dapat meninjau, menyetujui, mengedit, atau mengembalikan/menolak nilai dewan juri dengan catatan resmi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
                >
                  Setujui Semua Pending ({submissions.filter(s => s.status === 'pending').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-stone-300 uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="p-3">Peserta & Nomor</th>
                    <th className="p-3">Mata Lomba</th>
                    <th className="p-3">Nama Juri</th>
                    <th className="p-3 text-center">Waktu Pengerjaan</th>
                    <th className="p-3 text-center">Total Nilai</th>
                    <th className="p-3 text-center">Tanda Tangan</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {submissions.map(sub => {
                    const pst = pesertaList.find(p => p.id === sub.pesertaId);
                    const ml = mataLombaList.find(m => m.id === sub.mataLombaId);

                    return (
                      <tr key={sub.id} className="hover:bg-stone-900/50">
                        <td className="p-3">
                          <div className="font-bold text-white">{pst?.nama || 'Peserta'}</div>
                          <div className="text-[11px] font-mono text-amber-400">{pst?.nomorDada} • {pst?.asalInstansi}</div>
                        </td>
                        <td className="p-3 text-stone-300">{ml?.nama}</td>
                        <td className="p-3 font-semibold text-stone-200">{sub.juriNama}</td>
                        <td className="p-3 text-center font-mono text-amber-300">
                          {sub.waktuPengerjaanDetik} dt ({Math.floor(sub.waktuPengerjaanDetik / 60)}m {sub.waktuPengerjaanDetik % 60}s)
                        </td>
                        <td className="p-3 text-center font-mono font-extrabold text-sm text-white">
                          {sub.totalNilai}
                        </td>
                        <td className="p-3 text-center">
                          {sub.tandaTanganUrl ? (
                            <img
                              src={sub.tandaTanganUrl}
                              alt="Tanda Tangan"
                              className="h-8 max-w-[70px] mx-auto object-contain bg-white rounded p-0.5 border border-stone-700"
                            />
                          ) : (
                            <span className="text-stone-600 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            sub.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : sub.status === 'rejected'
                              ? 'bg-red-950 text-red-300 border border-red-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                          }`}>
                            {sub.status === 'approved' ? '✓ Disetujui' : sub.status === 'rejected' ? '✕ Dikembalikan/Tolak' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setInspectingSub(sub)}
                              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs cursor-pointer"
                              title="Lihat Rincian Lengkap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPrintMode('blangko_per_peserta_per_lomba');
                                setPrintSelectedMl(sub.mataLombaId);
                                setPrintSelectedPst(sub.pesertaId);
                                setPrintIncludeFilled(true);
                                setPrintModalOpen(true);
                              }}
                              className="p-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 rounded-lg text-xs cursor-pointer border border-amber-600/40"
                              title="Cetak Berkas Nilai ke Printer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditSubmission(sub)}
                              className="p-1.5 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded-lg text-xs cursor-pointer"
                              title="Edit Data Penilaian"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {sub.status !== 'approved' && (
                              <button
                                onClick={() => handleApproveSubmission(sub.id)}
                                className="p-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs cursor-pointer"
                                title="Setujui Nilai"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenRejectModal(sub.id)}
                              className="p-1.5 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg text-xs cursor-pointer"
                              title="Tolak / Kembalikan Nilai"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(sub.id)}
                              className="p-1.5 bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400 rounded-lg text-xs cursor-pointer"
                              title="Hapus Penilaian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-stone-500 italic">
                        Belum ada data nilai juri yang dikirimkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DAFTAR MATA LOMBA & PENGATURAN MULTI-JURI */}
        {activeTab === 'matalomba' && (
          <div className="space-y-6">
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Daftar Mata Lomba & Pengaturan Multi-Juri
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Satu mata lomba dapat dinilai lebih dari 4 juri, dilengkapi kriteria penilaian (Ceklis atau Angka Langsung) dan durasi tie-breaker.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenCreateMl}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Mata Lomba
                  </button>
                </div>
              </div>

              {/* Mata Lomba Cards */}
              <div className="space-y-4">
                {mataLombaList.map(ml => (
                  <div key={ml.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                            {ml.kode}
                          </span>
                          <h3 className="font-bold text-base text-white">{ml.nama}</h3>
                          <span className="text-[11px] text-stone-400">({ml.kategori})</span>
                        </div>
                        <p className="text-xs text-stone-300 mt-1">{ml.deskripsi}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenAddKriteria(ml.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Kriteria
                        </button>
                        <button
                          onClick={() => handleOpenEditMl(ml)}
                          className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs cursor-pointer"
                          title="Edit Mata Lomba"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMataLomba(ml.id, ml.nama)}
                          className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded-lg text-xs cursor-pointer"
                          title="Hapus Mata Lomba"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950 p-3 rounded-lg border border-stone-800 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">Pencatatan Waktu (Tie-Breaker):</span>
                        <strong className="text-amber-300 font-mono">
                          Batas Waktu Lomba: {ml.durasiMaksimalMenit} Menit
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Dewan Juri Ditugaskan:</span>
                        <strong className="text-stone-200">
                          {ml.assignedJuriIds?.length || 0} Juri (Multi-Juri)
                        </strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Total Kriteria Penilaian:</span>
                        <strong className="text-stone-200">
                          {ml.kriteriaList?.length || 0} Kriteria
                        </strong>
                      </div>
                    </div>

                    {/* Kriteria List within Mata Lomba */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-300">Daftar Kriteria Penilaian:</span>
                      </div>

                      <div className="space-y-1.5">
                        {ml.kriteriaList?.map((crit, cIdx) => (
                          <div
                            key={crit.id}
                            className="flex items-center justify-between bg-stone-950 p-3 rounded-lg border border-stone-800 text-xs"
                          >
                            <div>
                              <span className="font-bold text-stone-200">{cIdx + 1}. {crit.nama}</span>
                              <span className="text-amber-400 ml-2 font-mono text-[11px] bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                                Tipe: {crit.tipe === 'checkbox' ? 'Kotak Ceklis' : 'Input Angka Langsung'} • Nilai Maks: {crit.nilaiMaksimal}
                              </span>
                              {crit.deskripsi && <div className="text-[11px] text-stone-400 mt-0.5">{crit.deskripsi}</div>}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditKriteria(ml.id, crit)}
                                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded cursor-pointer"
                                title="Edit Kriteria"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteKriteria(ml.id, crit.id, crit.nama)}
                                className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded cursor-pointer"
                                title="Hapus Kriteria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONTROL PANEL JADWAL & LOKASI LOMBA */}
        {activeTab === 'jadwal_lokasi' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  Control Panel: Pengaturan Jadwal & Lokasi Lomba
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Admin dapat mengedit, menambah, dan menghapus jadwal serta lokasi arena lomba untuk setiap cabang perlombaan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mataLombaList.map(ml => (
                <div key={ml.id} className="bg-stone-900 border border-stone-800 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-amber-400">{ml.kode}</span>
                      <h3 className="font-bold text-sm text-white">{ml.nama}</h3>
                    </div>
                    <span className="text-xs bg-stone-950 px-2.5 py-1 rounded border border-stone-800 text-stone-300">
                      Durasi Maks: {ml.durasiMaksimalMenit} Menit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-stone-400 block mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        Lokasi / Arena Perlombaan:
                      </label>
                      <input
                        type="text"
                        defaultValue={ml.lokasi}
                        id={`lokasi_${ml.id}`}
                        className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 block mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Jadwal / Waktu Pelaksanaan:
                      </label>
                      <input
                        type="text"
                        defaultValue={ml.jadwal}
                        id={`jadwal_${ml.id}`}
                        className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                    <span className="text-[11px] text-stone-500">
                      Gunakan tombol Edit/Hapus/Simpan untuk memperbarui lokasi arena & jadwal.
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditMl(ml)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs cursor-pointer transition-all border border-stone-700"
                        title="Buka Form Edit Lengkap"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-400" />
                        Edit Form
                      </button>
                      <button
                        onClick={() => handleClearJadwalLokasi(ml.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded-lg text-xs cursor-pointer transition-all border border-red-900"
                        title="Hapus / Kosongkan Jadwal & Lokasi Lomba"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        Hapus Jadwal/Lokasi
                      </button>
                      <button
                        onClick={() => {
                          const newLokasi = (document.getElementById(`lokasi_${ml.id}`) as HTMLInputElement)?.value || ml.lokasi || '';
                          const newJadwal = (document.getElementById(`jadwal_${ml.id}`) as HTMLInputElement)?.value || ml.jadwal || '';
                          handleSaveJadwalLokasi(ml.id, newJadwal, newLokasi);
                        }}
                        className="flex items-center gap-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs shadow cursor-pointer transition-all"
                        title="Simpan Perubahan Jadwal & Lokasi"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Simpan Jadwal & Lokasi
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MANAJEMEN PESERTA */}
        {activeTab === 'peserta' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Manajemen Peserta Perlombaan
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Tambah peserta manual, edit data, hapus, atau unggah file CSV secara masal per mata lomba.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadTemplatePeserta}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Unduh Template CSV
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow">
                  <Upload className="w-3.5 h-3.5" />
                  Impor File CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleImportPesertaCSV}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleOpenCreatePeserta}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Manual
                </button>
              </div>
            </div>

            {/* Table Peserta */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-stone-300 uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3 text-center w-20">No Dada</th>
                    <th className="p-3">Nama Peserta</th>
                    <th className="p-3">Asal Instansi</th>
                    <th className="p-3">Mata Lomba</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {pesertaList.map((pst, idx) => {
                    const ml = mataLombaList.find(m => m.id === pst.mataLombaId);
                    return (
                      <tr key={pst.id} className="hover:bg-stone-900/50">
                        <td className="p-3 text-center font-bold text-stone-400">{idx + 1}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-400">{pst.nomorDada}</td>
                        <td className="p-3 font-bold text-white">{pst.nama}</td>
                        <td className="p-3 text-stone-300">{pst.asalInstansi}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const pMlIds = (pst.mataLombaIds && pst.mataLombaIds.length > 0)
                                ? pst.mataLombaIds
                                : (pst.mataLombaId ? [pst.mataLombaId] : []);
                              const matchedMls = mataLombaList.filter(m => pMlIds.includes(m.id));
                              if (matchedMls.length === 0) return <span className="text-stone-500 italic text-[11px]">- Belum ada cabang -</span>;
                              return matchedMls.map(m => (
                                <span
                                  key={m.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                >
                                  {m.kode ? `${m.kode} - ` : ''}{m.nama}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditPeserta(pst)}
                              className="p-1.5 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded cursor-pointer"
                              title="Edit Peserta"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePeserta(pst.id, pst.nama)}
                              className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded cursor-pointer"
                              title="Hapus Peserta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pesertaList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-stone-500 italic">
                        Belum ada data peserta terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: MANAJEMEN PENGGUNA (RBAC) */}
        {activeTab === 'users' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Manajemen Akun Pengguna (RBAC)
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Kelola hak akses Super Admin, Admin Bayangan (Co-Admin), Dewan Juri, dan Voter dengan privasi password terlindungi.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadTemplateUsers}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Unduh Template CSV User
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer shadow">
                  <Upload className="w-3.5 h-3.5" />
                  Impor File CSV User
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleImportUsersCSV}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleOpenCreateUser}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Akun Baru
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-stone-300 uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="p-3">Nama Lengkap</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Kata Sandi (Privasi)</th>
                    <th className="p-3">Peran / Role</th>
                    <th className="p-3">Keterangan Khusus</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {usersList.map(user => {
                    const isPassVisible = visiblePasswords[user.id];

                    return (
                      <tr key={user.id} className="hover:bg-stone-900/50">
                        <td className="p-3 font-bold text-white">{user.name}</td>
                        <td className="p-3 font-mono text-amber-400">{user.username}</td>
                        <td className="p-3 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-300">
                              {isPassVisible ? user.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-stone-500 hover:text-amber-300 p-0.5 cursor-pointer"
                              title={isPassVisible ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            user.role === 'super_admin'
                              ? 'bg-amber-900/70 text-amber-300 border border-amber-500/40'
                              : user.role === 'shadow_admin'
                              ? 'bg-blue-900/70 text-blue-300 border border-blue-500/40'
                              : user.role === 'juri'
                              ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-500/40'
                              : 'bg-stone-800 text-stone-300'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 text-stone-400">
                          {user.role === 'voter' && `Saldo: ${user.voteBalance || 0} Suara`}
                          {user.role === 'juri' && `Tugas: ${user.assignedMataLombaIds?.length || 0} Lomba`}
                          {user.role === 'shadow_admin' && 'Akses Operasional Sistem'}
                          {user.role === 'super_admin' && 'Akses Penuh Seluruh Sistem'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1.5 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded cursor-pointer"
                              title="Edit Akun Pengguna"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {user.role !== 'super_admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="p-1.5 bg-red-950 hover:bg-red-800 text-red-300 rounded cursor-pointer"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: VERIFIKASI DANA QRIS */}
        {activeTab === 'dana_topup' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Verifikasi Pembayaran DANA QRIS (Nomor: {localConfig.nomorDanaAdmin || '081314420312'})
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Tersedia menu lengkap: Setujui, Tolak/Kembalikan, Edit transaksi, dan Hapus riwayat.
                </p>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800 text-xs">
                  <span className="text-stone-300">Auto-Approve Webhook DANA:</span>
                  <button
                    onClick={() => {
                      const updated = { ...localConfig, autoApproveWebhookEnabled: !localConfig.autoApproveWebhookEnabled };
                      setLocalConfig(updated);
                      StorageService.saveEventConfig(updated);
                      onUpdateEventConfig(updated);
                    }}
                    className={`px-2.5 py-0.5 rounded-md font-bold cursor-pointer ${
                      localConfig.autoApproveWebhookEnabled ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {localConfig.autoApproveWebhookEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}
            </div>

            {/* Banner & Pengaturan Cepat Kode QRIS DANA */}
            <div className="bg-stone-900/90 border border-emerald-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {localConfig.qrisImageUrl ? (
                  <img
                    src={localConfig.qrisImageUrl}
                    alt="QRIS DANA"
                    className="w-14 h-14 object-contain bg-white rounded-lg p-0.5 border-2 border-emerald-500 shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-stone-950 border border-stone-800 flex flex-col items-center justify-center text-stone-500">
                    <CreditCard className="w-6 h-6 text-emerald-400" />
                    <span className="text-[8px] text-stone-400 mt-0.5">Default QR</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-white">Kode Barcode QRIS DANA Pembelian Suara</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      localConfig.qrisImageUrl ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40' : 'bg-amber-950 text-amber-300 border border-amber-600/40'
                    }`}>
                      {localConfig.qrisImageUrl ? '✓ Foto QRIS Kustom Aktif' : 'Barcode Bawaan'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Akun: <strong className="text-amber-300">{localConfig.namaAkunDana}</strong> ({localConfig.nomorDanaAdmin}) • Ditampilkan di popup scan pemirsa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow">
                  <Upload className="w-3.5 h-3.5" />
                  {localConfig.qrisImageUrl ? 'Ganti QRIS' : 'Unggah QRIS'}
                  <input type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
                </label>
                {localConfig.qrisImageUrl && (
                  <button
                    onClick={() => {
                      const updated = { ...localConfig, qrisImageUrl: '' };
                      setLocalConfig(updated);
                      StorageService.saveEventConfig(updated);
                      onUpdateEventConfig(updated);
                      showAlert('error', 'Foto QRIS DANA telah dihapus.');
                    }}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-red-950 text-stone-300 hover:text-red-300 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-stone-300 uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="p-3">Voter</th>
                    <th className="p-3">Nama Pengirim DANA</th>
                    <th className="p-3 text-center">Jumlah Vote</th>
                    <th className="p-3 text-center">Nominal Transfer</th>
                    <th className="p-3 text-center">Bukti Transfer</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi Lengkap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {topupList.map(item => (
                    <tr key={item.id} className="hover:bg-stone-900/50">
                      <td className="p-3 font-bold text-white">{item.voterNama}</td>
                      <td className="p-3 text-stone-300">
                        <div>{item.pengirimNama}</div>
                        <div className="text-[10px] text-stone-500 font-mono">{item.pengirimNomorHp || '-'}</div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {item.jumlahVote} Suara
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-400">
                        Rp {item.hargaTotal.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center">
                        {item.buktiTransferUrl ? (
                          <button
                            onClick={() => setViewingProofUrl(item.buktiTransferUrl)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded text-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat Foto
                          </button>
                        ) : (
                          <span className="text-stone-500 italic">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : item.status === 'rejected'
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}>
                          {item.status === 'approved' ? '✓ Disetujui' : item.status === 'rejected' ? '✕ Ditolak' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.status !== 'approved' && (
                            <button
                              onClick={() => handleApproveTopup(item.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs cursor-pointer"
                              title="Setujui Pembayaran"
                            >
                              Setujui
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditTopup(item)}
                            className="p-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded text-xs cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {item.status !== 'rejected' && (
                            <button
                              onClick={() => handleOpenRejectTopupModal(item.id)}
                              className="px-2 py-1 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded text-xs cursor-pointer"
                              title="Tolak / Kembalikan Transaksi"
                            >
                              Tolak
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTopup(item.id)}
                            className="p-1 bg-red-950 hover:bg-red-800 text-red-300 rounded text-xs cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {topupList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-stone-500 italic">
                        Belum ada data permintaan top-up voting.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: KATEGORI VOTING BERBAYAR */}
        {activeTab === 'voting_cat' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Vote className="w-5 h-5 text-red-500" />
                  Kategori Voting Berbayar
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Admin dapat membuat kategori baru, mengedit, menentukan harga per vote (IDR), dan menghapus kategori.
                </p>
              </div>

              <button
                onClick={handleOpenCreateVotingCat}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Kategori Voting
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {votingCategories.map(cat => (
                <div key={cat.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-white">{cat.nama}</h3>
                      <p className="text-xs text-stone-400 mt-0.5">{cat.deskripsi}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800">
                        Rp {cat.hargaPerVote.toLocaleString('id-ID')} / Vote
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs border-t border-stone-800">
                    <span className="text-stone-400">
                      Suara Terkumpul: <strong className="text-white font-mono">{StorageService.getVoteRecords().filter(r => r.votingCategoryId === cat.id).reduce((a, b) => a + b.jumlahVote, 0)}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditVotingCat(cat)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit Kategori
                      </button>
                      <button
                        onClick={() => handleDeleteVotingCat(cat.id, cat.nama)}
                        className="p-1 bg-red-950 hover:bg-red-800 text-red-300 rounded cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: CETAK & EKSPOR LAPORAN RESMI (PDF STANDAR A4) */}
        {activeTab === 'cetak_laporan' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-stone-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                Cetak & Ekspor Laporan Resmi (PDF Standar A4 & Integrasi Printer)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Fitur cetak langsung ke perangkat printer fisik/thermal melalui sistem cetak browser atau unduh file dokumen resmi.
              </p>
            </div>

            {/* Integrasi Perangkat Cetak Langsung (Printer Fisik Standar A4 & Thermal POS) */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Integrasi Perangkat Cetak (Printer Fisik & Thermal)
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-2 py-0.5 rounded-full font-bold">
                      ✓ Siap Cetak
                    </span>
                  </h3>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Mendukung printer fisik laser/inkjet standar kertas A4 (Kop & tanda tangan resmi) serta printer struk thermal (POS 58mm & 80mm).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    soundService.playClick();
                    setPrintMode('blangko_semua_peserta_per_lomba');
                    setPrintModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Blangko Juri (A4)
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    setPrintMode('rekapan_keseluruhan');
                    setPrintModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/40 flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Rekapan Master
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Rekapan Nilai Per Mata Lomba */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-amber-300">
                    1. Rekapan Nilai Per Mata Lomba (Hasil Akhir & Perangkingan)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Daftar peringkat kejuaraan (Juara 1-3 & Harapan 1-3) lengkap dengan waktu tie-breaker dan rata-rata skor per cabang lomba.
                  </p>
                  <div className="mt-3">
                    <label className="text-[11px] text-stone-300 block mb-1">Pilih Mata Lomba:</label>
                    <select
                      value={printSelectedMl}
                      onChange={e => setPrintSelectedMl(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs text-white"
                    >
                      {mataLombaList.map(ml => (
                        <option key={ml.id} value={ml.id}>
                          {ml.kode} - {ml.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPrintMode('rekapan_per_matalomba');
                    setPrintModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow cursor-pointer"
                >
                  Buka & Download Rekapan Per Lomba
                </button>
              </div>

              {/* Option 2: Rekapan Keseluruhan Semua Mata Lomba */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-amber-300">
                    2. Rekapan Nilai Keseluruhan Semua Mata Lomba
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Laporan master gabungan seluruh cabang perlombaan untuk arsip panitia pusat dan dewan juri kehormatan.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setPrintMode('rekapan_keseluruhan');
                    setPrintModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow cursor-pointer"
                >
                  Buka & Download Rekapan Master Semua Lomba
                </button>
              </div>

              {/* Option 3: Blangko Format Penilaian (Per Peserta / Semua) */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3 flex flex-col justify-between md:col-span-2">
                <div>
                  <h3 className="font-bold text-sm text-amber-300">
                    3. Blangko Lembar Penilaian Juri (Ceklis Dinamis & Halaman Terpisah)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Mendukung pencetakan dan download PDF dengan pemisahan 1 halaman per peserta, kolom ceklis dinamis, dan hasil stopwatch.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="text-[11px] text-stone-300 block mb-1">Mata Lomba:</label>
                      <select
                        value={printSelectedMl}
                        onChange={e => setPrintSelectedMl(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs text-white"
                      >
                        {mataLombaList.map(ml => (
                          <option key={ml.id} value={ml.id}>
                            {ml.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-stone-300 block mb-1">Peserta (Opsional):</label>
                      <select
                        value={printSelectedPst}
                        onChange={e => setPrintSelectedPst(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="">-- Semua Peserta --</option>
                        {pesertaList.filter(p => !printSelectedMl || p.mataLombaId === printSelectedMl || (Array.isArray(p.mataLombaIds) && p.mataLombaIds.includes(printSelectedMl))).map(pst => (
                          <option key={pst.id} value={pst.id}>
                            {pst.nomorDada} - {pst.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-stone-300 block mb-1">Format Blangko:</label>
                      <select
                        value={printIncludeFilled ? 'filled' : 'empty'}
                        onChange={e => setPrintIncludeFilled(e.target.value === 'filled')}
                        className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="empty">Blangko Kosong (Untuk Isian Manual Juri)</option>
                        <option value="filled">Blangko Berisi Nilai Resmi Juri</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <button
                    onClick={() => {
                      setPrintMode('blangko_per_peserta_per_lomba');
                      setPrintModalOpen(true);
                    }}
                    className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 text-center"
                  >
                    Per Peserta Per Lomba
                  </button>
                  <button
                    onClick={() => {
                      setPrintMode('blangko_per_peserta_semua_lomba');
                      setPrintModalOpen(true);
                    }}
                    className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 text-center"
                  >
                    Per Peserta Semua Lomba
                  </button>
                  <button
                    onClick={() => {
                      setPrintMode('blangko_semua_peserta_per_lomba');
                      setPrintModalOpen(true);
                    }}
                    className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer border border-stone-700 text-center"
                  >
                    Semua Peserta Per Lomba (Pisah Halaman)
                  </button>
                  <button
                    onClick={() => {
                      setPrintMode('blangko_semua_peserta_semua_lomba');
                      setPrintModalOpen(true);
                    }}
                    className="p-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 rounded-xl text-xs font-bold cursor-pointer text-center shadow"
                  >
                    Semua Peserta Semua Lomba (1 Peserta = 1 Hal)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: PENGATURAN ACARA, TEMA & MULTIMEDIA (HANYA SUPER ADMIN) */}
        {activeTab === 'settings' && isSuperAdmin && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  Pengaturan Sistem, Tema & Menu Kontrol Fitur
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Khusus Super Admin Utama (Usseradmin). Perubahan tersimpan permanen dan real-time.
                </p>
              </div>

              <button
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-xl cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Seluruh Pengaturan
              </button>
            </div>

            {/* SECTION: MENU KONTROL FITUR (TOGGLE ON/OFF) */}
            <div className="bg-stone-900/90 border border-amber-500/40 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                MENU KONTROL FITUR (TOGGLE ON/OFF SUPER ADMIN)
              </h3>
              <p className="text-xs text-stone-400">
                Menu khusus bagi Admin Utama untuk mengaktifkan atau menonaktifkan fitur vital:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* a. Penutupan Voting */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-stone-200">a. Penutupan Voting</h4>
                    <p className="text-[11px] text-stone-400">
                      Jika diaktifkan, seluruh aktivitas voting peserta ditutup secara resmi.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleVotingClosed}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      localConfig.votingClosed
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {localConfig.votingClosed ? 'Voting DITUTUP' : 'Voting TERBUKA'}
                  </button>
                </div>

                {/* b. Transfer Dana */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-stone-200">b. Transfer Dana (QRIS DANA)</h4>
                    <p className="text-[11px] text-stone-400">
                      Jika dinonaktifkan, pembelian saldo vote via DANA dihentikan sementara.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleDanaTransfer}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      localConfig.danaTransferDisabled
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-emerald-700 text-white shadow'
                    }`}
                  >
                    {localConfig.danaTransferDisabled ? 'Transfer DINONAKTIFKAN' : 'Transfer DIAKTIFKAN'}
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION: IDENTITAS KEGIATAN & TEKS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-stone-300 block mb-1">Judul Utama Kegiatan:</label>
                  <input
                    type="text"
                    value={localConfig.judulKegiatan}
                    onChange={e => setLocalConfig({ ...localConfig, judulKegiatan: e.target.value })}
                    className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-300 block mb-1">Sub Judul Kegiatan:</label>
                  <input
                    type="text"
                    value={localConfig.subJudul}
                    onChange={e => setLocalConfig({ ...localConfig, subJudul: e.target.value })}
                    className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-300 block mb-1">Tempat / Lokasi Kegiatan:</label>
                  <input
                    type="text"
                    value={localConfig.tempat}
                    onChange={e => setLocalConfig({ ...localConfig, tempat: e.target.value })}
                    className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-stone-300 block mb-1">Tanggal & Waktu Kegiatan:</label>
                  <input
                    type="text"
                    value={localConfig.tanggalWaktu}
                    onChange={e => setLocalConfig({ ...localConfig, tanggalWaktu: e.target.value })}
                    className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-300 block mb-1">Penyelenggara / Panitia Resmi:</label>
                  <input
                    type="text"
                    value={localConfig.penyelenggara}
                    onChange={e => setLocalConfig({ ...localConfig, penyelenggara: e.target.value })}
                    className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-300 block mb-1">Nomor Akun DANA Panitia:</label>
                  <input
                    type="text"
                    value={localConfig.nomorDanaAdmin}
                    onChange={e => setLocalConfig({ ...localConfig, nomorDanaAdmin: e.target.value })}
                    className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-amber-300 font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-300 block mb-1">Deskripsi Lengkap Kegiatan:</label>
              <textarea
                rows={3}
                value={localConfig.deskripsi}
                onChange={e => setLocalConfig({ ...localConfig, deskripsi: e.target.value })}
                className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            {/* SECTION 1: KUSTOMISASI PROFIL DAN LATAR BELAKANG APLIKASI */}
            <div className="bg-stone-900/90 p-5 rounded-2xl border border-stone-800 space-y-4">
              <div className="border-b border-stone-800 pb-2">
                <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  KUSTOMISASI PROFIL DAN LATAR BELAKANG (BACKGROUND) APLIKASI
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Ganti foto profil resmi aplikasi serta ubah gambar latar belakang (background) dan warna tema secara dinamis dan real-time.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Foto Profil / Logo Aplikasi */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-center space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">Foto Profil / Logo Aplikasi</span>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Tampil pada Navbar atas, header portal, dan identitas resmi sistem.
                    </p>
                  </div>

                  <div className="py-2">
                    {localConfig.logoUrl ? (
                      <div className="space-y-2">
                        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-amber-500 shadow-md bg-stone-900 flex items-center justify-center p-1">
                          <img src={localConfig.logoUrl} alt="Foto Profil" className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <span className="inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-600/40">
                          ✓ Foto Profil Terpasang
                        </span>
                      </div>
                    ) : (
                      <div className="w-20 h-20 mx-auto rounded-2xl border-2 border-dashed border-stone-700 flex flex-col items-center justify-center text-stone-500">
                        <ImageIcon className="w-6 h-6 mb-1 text-stone-600" />
                        <span className="text-[9px]">Belum Ada Foto</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-xl text-xs cursor-pointer shadow">
                      <Upload className="w-3.5 h-3.5" />
                      {localConfig.logoUrl ? 'Ganti Foto Profil' : 'Unggah Foto Profil'}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>

                    {localConfig.logoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...localConfig, logoUrl: '' };
                          setLocalConfig(updated);
                          StorageService.saveEventConfig(updated);
                          onUpdateEventConfig(updated);
                          showAlert('error', 'Foto profil aplikasi telah dihapus (kembali ke icon default).');
                        }}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer block mx-auto pt-1"
                      >
                        Hapus Foto Profil
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Gambar Latar Belakang (Background) */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-center space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">Gambar Latar Belakang (Background)</span>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Menghiasi tampilan latar belakang seluruh halaman web secara dinamis.
                    </p>
                  </div>

                  <div className="py-2">
                    {localConfig.backgroundUrl ? (
                      <div className="space-y-2">
                        <div className="w-full h-20 rounded-xl overflow-hidden border border-amber-500/50 shadow-md bg-stone-900">
                          <img src={localConfig.backgroundUrl} alt="Background" className="w-full h-full object-cover" />
                        </div>
                        <span className="inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-600/40">
                          ✓ Background Gambar Aktif
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-20 rounded-xl border-2 border-dashed border-stone-700 flex flex-col items-center justify-center text-stone-500">
                        <span className="text-[10px]">Warna Dasar Aktif: {localConfig.backgroundColor || '#1c1917'}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs cursor-pointer border border-stone-700">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      {localConfig.backgroundUrl ? 'Ganti Gambar Background' : 'Unggah Gambar Background'}
                      <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
                    </label>

                    {localConfig.backgroundUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...localConfig, backgroundUrl: '' };
                          setLocalConfig(updated);
                          StorageService.saveEventConfig(updated);
                          onUpdateEventConfig(updated);
                          showAlert('error', 'Gambar latar belakang dihapus (menggunakan warna dasar).');
                        }}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer block mx-auto pt-1"
                      >
                        Hapus Background Gambar
                      </button>
                    )}

                    <div className="pt-2 border-t border-stone-800 text-left">
                      <label className="text-[10px] text-stone-400 block mb-1">Pilih Warna Dasar Aplikasi:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={localConfig.backgroundColor || '#1c1917'}
                          onChange={e => {
                            const updated = { ...localConfig, backgroundColor: e.target.value };
                            setLocalConfig(updated);
                            StorageService.saveEventConfig(updated);
                            onUpdateEventConfig(updated);
                          }}
                          className="w-8 h-8 rounded border border-stone-700 cursor-pointer bg-transparent"
                          title="Pilih Warna Hex"
                        />
                        <span className="text-xs font-mono text-stone-300">{localConfig.backgroundColor || '#1c1917'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Musik Latar Belakang (BGM Audio) */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-center space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">Musik Latar Belakang (BGM)</span>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Musik instrumen yang diputar berulang (loop) saat aplikasi dibuka.
                    </p>
                  </div>

                  <div className="py-2">
                    {localConfig.bgmAudioUrl ? (
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-600/40">
                          ✓ File Audio Kustom Terpasang
                        </span>
                        <p className="text-[10px] text-stone-400">Audio lokal tersimpan aman</p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-400/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                        Synthesizer Ambient Digital Aktif
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold cursor-pointer border border-stone-700">
                        <Music className="w-3.5 h-3.5 text-amber-400" />
                        Pilih File Audio
                        <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handleTestAudioToggle}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {isAudioPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isAudioPreviewPlaying ? 'Jeda' : 'Test Putar'}
                      </button>
                    </div>

                    {localConfig.bgmAudioUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...localConfig, bgmAudioUrl: '' };
                          setLocalConfig(updated);
                          StorageService.saveEventConfig(updated);
                          onUpdateEventConfig(updated);
                          soundService.startGlobalBGM('');
                          setIsAudioPreviewPlaying(false);
                          showAlert('error', 'File audio kustom direset ke synthesizer bawaan.');
                        }}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer block mx-auto pt-1"
                      >
                        Reset ke Synthesizer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: UPLOAD & KELOLA KODE QRIS DANA (UNTUK PEMBELIAN SUARA / VOTE) */}
            <div className="bg-stone-900/90 p-5 rounded-2xl border border-emerald-500/40 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    UPLOAD & KELOLA KODE QRIS DANA (PEMBELIAN SUARA / VOTE)
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Unggah gambar barcode QRIS DANA resmi panitia. Gambar ini akan otomatis muncul pada halaman pembayaran suara/vote pemirsa agar dapat langsung dipindai (scan) oleh masyarakat.
                  </p>
                </div>

                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg">
                  <Upload className="w-4 h-4" />
                  {localConfig.qrisImageUrl ? 'Unggah / Ganti QRIS Baru' : 'Unggah Gambar QRIS DANA'}
                  <input type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* QRIS Preview Box (4 cols) */}
                <div className="md:col-span-4 bg-stone-950 p-4 rounded-xl border border-stone-800 text-center space-y-3">
                  <span className="text-xs font-bold text-stone-300 block">Tampilan Barcode QRIS Aktif:</span>

                  <div className="bg-white p-3 rounded-2xl border-4 border-amber-400 max-w-[220px] mx-auto shadow-lg flex flex-col items-center justify-center">
                    {localConfig.qrisImageUrl ? (
                      <div className="space-y-1">
                        <img
                          src={localConfig.qrisImageUrl}
                          alt="QRIS DANA Aktif"
                          className="w-44 h-44 object-contain mx-auto rounded-lg"
                        />
                        <div className="text-[10px] text-emerald-800 font-bold">
                          ✓ QRIS RESMI TERHUBUNG
                        </div>
                      </div>
                    ) : (
                      <div className="w-44 h-44 flex flex-col items-center justify-center text-stone-400 border border-dashed border-stone-300 rounded-lg p-2">
                        <CreditCard className="w-10 h-10 text-stone-300 mb-2" />
                        <span className="text-[11px] text-stone-500 text-center leading-tight">
                          Belum ada foto QRIS yang diunggah. Sistem menampilkan QRIS default.
                        </span>
                      </div>
                    )}
                  </div>

                  {localConfig.qrisImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...localConfig, qrisImageUrl: '' };
                        setLocalConfig(updated);
                        StorageService.saveEventConfig(updated);
                        onUpdateEventConfig(updated);
                        showAlert('error', 'Gambar QRIS DANA dihapus (kembali ke barcode default).');
                      }}
                      className="text-xs text-red-400 hover:underline cursor-pointer block mx-auto"
                    >
                      Hapus Gambar QRIS
                    </button>
                  )}
                </div>

                {/* QRIS Info & Account Settings (8 cols) */}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                      <span className="text-[11px] text-stone-400 block mb-1">Nomor Akun DANA Panitia:</span>
                      <input
                        type="text"
                        value={localConfig.nomorDanaAdmin}
                        onChange={e => setLocalConfig({ ...localConfig, nomorDanaAdmin: e.target.value })}
                        className="w-full p-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-amber-300 font-mono font-bold outline-none focus:border-amber-500"
                        placeholder="081314420312"
                      />
                      <span className="text-[10px] text-stone-500 mt-1 block">Nomor rekening transfer DANA resmi</span>
                    </div>

                    <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                      <span className="text-[11px] text-stone-400 block mb-1">Nama Pemilik Akun DANA:</span>
                      <input
                        type="text"
                        value={localConfig.namaAkunDana}
                        onChange={e => setLocalConfig({ ...localConfig, namaAkunDana: e.target.value })}
                        className="w-full p-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white font-bold outline-none focus:border-amber-500"
                        placeholder="S-IMPEL DIGITAL"
                      />
                      <span className="text-[10px] text-stone-500 mt-1 block">Nama yang muncul saat scan QRIS</span>
                    </div>
                  </div>

                  <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-xs text-stone-300 space-y-2">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Status Integrasi QRIS Pembelian Suara:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-stone-400 text-[11px]">
                      <li>
                        Setiap pemirsa yang menekan tombol <strong>Beli Suara / Top Up Vote</strong> akan langsung melihat QRIS yang diunggah di sini.
                      </li>
                      <li>
                        Dukungan format foto QRIS: <strong>PNG, JPG, JPEG, WebP</strong> (Maksimal resolusi tajam agar mudah dipindai oleh kamera HP).
                      </li>
                      <li>
                        Perubahan langsung aktif seketika tanpa perlu restart sistem.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: DATA BACKUP & RESET */}
            <div className="bg-stone-900 p-5 rounded-2xl border border-stone-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xs text-stone-200">Backup & Pemulihan Sistem</h4>
                <p className="text-[11px] text-stone-400">
                  Unduh seluruh database dalam format JSON untuk cadangan aman.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const json = StorageService.exportFullBackup();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `backup_simpel_digital_${Date.now()}.json`;
                    link.click();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Backup JSON
                </button>

                <button
                  onClick={() => {
                    if (confirm('PERINGATAN: Kembalikan seluruh database ke setelan default awal? Data perubahan saat ini akan di-reset.')) {
                      StorageService.resetAllToDefault();
                      reloadData();
                      showAlert('success', 'Seluruh sistem berhasil di-reset ke setelan awal!');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-950 hover:bg-red-800 text-red-200 rounded-xl text-xs font-semibold cursor-pointer border border-red-900"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset ke Data Default
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ----------------- MODAL: EDIT SUBMISSION JURI ----------------- */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">Edit Berkas Penilaian Dewan Juri</h3>
              <button onClick={() => setEditingSub(null)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveEditedSubmission} className="space-y-3">
              <div>
                <label className="text-stone-400 block mb-1">Juri Penilai:</label>
                <input
                  type="text"
                  disabled
                  value={editingSub.juriNama}
                  className="w-full p-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Waktu Pengerjaan (Detik):</label>
                  <input
                    type="number"
                    min="0"
                    value={editingSub.waktuPengerjaanDetik}
                    onChange={e => setEditingSub({ ...editingSub, waktuPengerjaanDetik: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Total Nilai Akhir:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingSub.totalNilai}
                    onChange={e => setEditingSub({ ...editingSub, totalNilai: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Status Verifikasi:</label>
                <select
                  value={editingSub.status}
                  onChange={e => setEditingSub({ ...editingSub, status: e.target.value as any })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                >
                  <option value="pending">Pending (Menunggu)</option>
                  <option value="approved">Approved (Disetujui / Tayang)</option>
                  <option value="rejected">Rejected (Dikembalikan / Ditolak)</option>
                </select>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Catatan Evaluasi Juri:</label>
                <textarea
                  rows={2}
                  value={editingSub.catatanJuri || ''}
                  onChange={e => setEditingSub({ ...editingSub, catatanJuri: e.target.value })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Catatan Khusus Admin:</label>
                <textarea
                  rows={2}
                  value={editingSub.adminNotes || ''}
                  onChange={e => setEditingSub({ ...editingSub, adminNotes: e.target.value })}
                  placeholder="Keterangan koreksi admin..."
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-lg shadow"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: TOLAK / KEMBALIKAN SUBMISSION ----------------- */}
      {rejectingSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Kembalikan / Tolak Penilaian Juri
              </h3>
              <button onClick={() => setRejectingSubId(null)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <p className="text-stone-300">
              Nilai akan dikembalikan ke status <strong>Rejected</strong> dan tidak akan dihitung di Live Score publik. Tuliskan alasan/catatan perbaikan untuk Juri:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Tuliskan catatan alasan penolakan/revisi..."
              className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-xl text-white outline-none focus:border-red-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingSubId(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow"
              >
                Konfirmasi Kembalikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: TOLAK / KEMBALIKAN PEMBAYARAN DANA ----------------- */}
      {rejectingTopupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-amber-600/60 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Tolak / Kembalikan Transaksi DANA
              </h3>
              <button onClick={() => setRejectingTopupId(null)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <p className="text-stone-300">
              Status permohonan top-up voting ini akan diubah menjadi <strong>Ditolak</strong>. Masukkan alasan penolakan untuk catatan voter & admin:
            </p>

            <textarea
              rows={3}
              value={rejectingTopupReason}
              onChange={e => setRejectingTopupReason(e.target.value)}
              placeholder="Contoh: Bukti transfer tidak valid atau dana belum masuk..."
              className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-xl text-white outline-none focus:border-amber-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setRejectingTopupId(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectTopup}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg shadow cursor-pointer"
              >
                Konfirmasi Tolak Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: MATA LOMBA (TAMBAH / EDIT) ----------------- */}
      {mataLombaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                {editingMl ? 'Edit Mata Lomba' : 'Tambah Mata Lomba Baru'}
              </h3>
              <button onClick={() => setMataLombaModalOpen(false)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveMataLomba} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Kode Lomba:</label>
                  <input
                    type="text"
                    required
                    value={mlFormData.kode}
                    onChange={e => setMlFormData({ ...mlFormData, kode: e.target.value })}
                    placeholder="Contoh: ORASI-01"
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Kategori Lomba:</label>
                  <input
                    type="text"
                    required
                    value={mlFormData.kategori}
                    onChange={e => setMlFormData({ ...mlFormData, kategori: e.target.value })}
                    placeholder="Contoh: Seni & Sastra"
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Nama Mata Lomba:</label>
                <input
                  type="text"
                  required
                  value={mlFormData.nama}
                  onChange={e => setMlFormData({ ...mlFormData, nama: e.target.value })}
                  placeholder="Contoh: Pidato Kebangsaan & Orasi Ilmiah"
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={mlFormData.deskripsi}
                  onChange={e => setMlFormData({ ...mlFormData, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat perlombaan..."
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Lokasi Arena:</label>
                  <input
                    type="text"
                    value={mlFormData.lokasi}
                    onChange={e => setMlFormData({ ...mlFormData, lokasi: e.target.value })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Jadwal Pelaksanaan:</label>
                  <input
                    type="text"
                    value={mlFormData.jadwal}
                    onChange={e => setMlFormData({ ...mlFormData, jadwal: e.target.value })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Durasi Target (Tie-Breaker Detik):</label>
                  <input
                    type="number"
                    min="1"
                    value={mlFormData.durasiTargetDetik}
                    onChange={e => setMlFormData({ ...mlFormData, durasiTargetDetik: parseInt(e.target.value) || 300 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Durasi Maksimal (Menit):</label>
                  <input
                    type="number"
                    min="1"
                    value={mlFormData.durasiMaksimalMenit}
                    onChange={e => setMlFormData({ ...mlFormData, durasiMaksimalMenit: parseInt(e.target.value) || 10 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              {/* Multi-juri Assignment Checkbox List */}
              <div>
                <label className="text-stone-300 block mb-1 font-semibold">
                  Tugaskan Dewan Juri (Dukungan Multi-Juri &gt; 4 Juri):
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-stone-950 p-2.5 rounded-lg border border-stone-800">
                  {usersList.filter(u => u.role === 'juri').map(j => {
                    const isChecked = mlFormData.assignedJuriIds.includes(j.id);
                    return (
                      <label key={j.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setMlFormData({ ...mlFormData, assignedJuriIds: [...mlFormData.assignedJuriIds, j.id] });
                            } else {
                              setMlFormData({ ...mlFormData, assignedJuriIds: mlFormData.assignedJuriIds.filter(id => id !== j.id) });
                            }
                          }}
                          className="accent-amber-500 rounded"
                        />
                        <span>{j.name} ({j.username})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setMataLombaModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-lg shadow"
                >
                  {editingMl ? 'Simpan Perubahan' : 'Buat Mata Lomba'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: KRITERIA PENILAIAN (TAMBAH / EDIT) ----------------- */}
      {kriteriaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                {editingKriteria ? 'Edit Kriteria Penilaian' : 'Tambah Kriteria Penilaian'}
              </h3>
              <button onClick={() => setKriteriaModalOpen(false)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveKriteria} className="space-y-3">
              <div>
                <label className="text-stone-300 block mb-1">Nama Kriteria Penilaian:</label>
                <input
                  type="text"
                  required
                  value={kriteriaFormData.nama}
                  onChange={e => setKriteriaFormData({ ...kriteriaFormData, nama: e.target.value })}
                  placeholder="Contoh: Artikulasi & Olah Vokal"
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Deskripsi / Indikator Penilaian:</label>
                <textarea
                  rows={2}
                  value={kriteriaFormData.deskripsi}
                  onChange={e => setKriteriaFormData({ ...kriteriaFormData, deskripsi: e.target.value })}
                  placeholder="Pedoman penilaian bagi juri..."
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-semibold">Tipe Penilaian Juri:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKriteriaFormData({ ...kriteriaFormData, tipe: 'checkbox' })}
                    className={`p-2.5 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                      kriteriaFormData.tipe === 'checkbox'
                        ? 'bg-amber-600 text-white border-amber-500 shadow'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    Kotak Ceklis (Centang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKriteriaFormData({ ...kriteriaFormData, tipe: 'number' })}
                    className={`p-2.5 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                      kriteriaFormData.tipe === 'number'
                        ? 'bg-amber-600 text-white border-amber-500 shadow'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    Input Angka Langsung
                  </button>
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">
                  Nilai Maksimal ({kriteriaFormData.tipe === 'checkbox' ? 'Jumlah Kotak Ceklis Otomatis' : 'Skor Tertinggi'}):
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={kriteriaFormData.nilaiMaksimal}
                  onChange={e => setKriteriaFormData({ ...kriteriaFormData, nilaiMaksimal: parseInt(e.target.value) || 10 })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  *Untuk tipe ceklis, jumlah kolom centang pada form penilaian juri akan otomatis berjumlah sesuai angka ini.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setKriteriaModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-lg shadow"
                >
                  Simpan Kriteria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: PESERTA (TAMBAH / EDIT) ----------------- */}
      {pesertaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                {editingPeserta ? 'Edit Data Peserta' : 'Tambah Peserta Manual'}
              </h3>
              <button onClick={() => setPesertaModalOpen(false)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSavePeserta} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Nomor Urut Tampil:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pesertaFormData.nomorUrut}
                    onChange={e => setPesertaFormData({ ...pesertaFormData, nomorUrut: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Nomor Dada Peserta:</label>
                  <input
                    type="text"
                    required
                    value={pesertaFormData.nomorDada}
                    onChange={e => setPesertaFormData({ ...pesertaFormData, nomorDada: e.target.value })}
                    placeholder="Contoh: OR-01"
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Nama Lengkap Peserta:</label>
                <input
                  type="text"
                  required
                  value={pesertaFormData.nama}
                  onChange={e => setPesertaFormData({ ...pesertaFormData, nama: e.target.value })}
                  placeholder="Nama lengkap peserta..."
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Asal Sekolah / Kampus / Instansi:</label>
                <input
                  type="text"
                  required
                  value={pesertaFormData.asalInstansi}
                  onChange={e => setPesertaFormData({ ...pesertaFormData, asalInstansi: e.target.value })}
                  placeholder="Contoh: SMA Negeri 1 Garuda"
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-stone-300 font-semibold text-xs">
                    Cabang Mata Lomba (Bisa Pilih Lebih dari 1):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = mataLombaList.map(m => m.id);
                        setPesertaFormData({
                          ...pesertaFormData,
                          mataLombaIds: allIds,
                          mataLombaId: allIds[0] || '',
                        });
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-stone-600 text-[10px]">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPesertaFormData({
                          ...pesertaFormData,
                          mataLombaIds: [],
                          mataLombaId: '',
                        });
                      }}
                      className="text-[10px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-stone-950 border border-stone-700 rounded-xl">
                  {mataLombaList.map(ml => {
                    const isChecked = (pesertaFormData.mataLombaIds || []).includes(ml.id);
                    return (
                      <label
                        key={ml.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 shadow-sm'
                            : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const cur = pesertaFormData.mataLombaIds || [];
                              const next = e.target.checked
                                ? [...cur, ml.id]
                                : cur.filter(id => id !== ml.id);
                              setPesertaFormData({
                                ...pesertaFormData,
                                mataLombaIds: next,
                                mataLombaId: next[0] || '',
                              });
                            }}
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <span className="font-semibold text-xs">{ml.nama}</span>
                        </div>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400">
                          {ml.kode}
                        </span>
                      </label>
                    );
                  })}
                  {mataLombaList.length === 0 && (
                    <div className="text-center py-3 text-stone-500 text-xs italic">
                      Belum ada mata lomba yang dibuat.
                    </div>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={`${(pesertaFormData.mataLombaIds?.length || 0) > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(pesertaFormData.mataLombaIds?.length || 0) > 0
                      ? `${pesertaFormData.mataLombaIds?.length} cabang lomba dipilih`
                      : '⚠️ Wajib memilih minimal 1 cabang lomba'}
                  </span>
                  <span className="text-stone-500 text-[10px]">
                    Centang satu atau beberapa cabang lomba
                  </span>
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Kategori Peserta:</label>
                <input
                  type="text"
                  value={pesertaFormData.kategori}
                  onChange={e => setPesertaFormData({ ...pesertaFormData, kategori: e.target.value })}
                  placeholder="Contoh: Nasional / Umum"
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setPesertaModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-lg shadow"
                >
                  {editingPeserta ? 'Simpan Perubahan' : 'Tambah Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: PENGGUNA (TAMBAH / EDIT) ----------------- */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="text-stone-300 block mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Contoh: Prof. Dr. Hendra Wijaya"
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Username:</label>
                  <input
                    type="text"
                    required
                    value={userFormData.username}
                    onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                    placeholder="Username login..."
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Kata Sandi (Password):</label>
                  <input
                    type="text"
                    required
                    value={userFormData.password}
                    onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="Password akun..."
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1 font-semibold">Peran Pengguna (Role):</label>
                <select
                  value={userFormData.role}
                  onChange={e => setUserFormData({ ...userFormData, role: e.target.value as any })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                >
                  <option value="juri">Dewan Juri / Penilai</option>
                  <option value="voter">Voter / Peserta Voting</option>
                  <option value="shadow_admin">Admin Bayangan (Co-Admin Operasional)</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin Utama</option>}
                </select>
              </div>

              {userFormData.role === 'voter' && (
                <div>
                  <label className="text-stone-300 block mb-1">Saldo Suara Awal (Vote Balance):</label>
                  <input
                    type="number"
                    min="0"
                    value={userFormData.voteBalance}
                    onChange={e => setUserFormData({ ...userFormData, voteBalance: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono font-bold"
                  />
                </div>
              )}

              {userFormData.role === 'juri' && (
                <div>
                  <label className="text-stone-300 block mb-1 font-semibold">
                    Tugaskan ke Mata Lomba:
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto bg-stone-950 p-2 rounded-lg border border-stone-800">
                    {mataLombaList.map(ml => {
                      const isAssigned = userFormData.assignedMataLombaIds?.includes(ml.id);
                      return (
                        <label key={ml.id} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={e => {
                              if (e.target.checked) {
                                setUserFormData({
                                  ...userFormData,
                                  assignedMataLombaIds: [...(userFormData.assignedMataLombaIds || []), ml.id],
                                });
                              } else {
                                setUserFormData({
                                  ...userFormData,
                                  assignedMataLombaIds: (userFormData.assignedMataLombaIds || []).filter(id => id !== ml.id),
                                });
                              }
                            }}
                            className="accent-amber-500 rounded"
                          />
                          <span>{ml.kode} - {ml.nama}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-bold rounded-lg shadow"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EDIT TOPUP DANA ----------------- */}
      {editingTopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">Edit Transaksi Pembelian DANA</h3>
              <button onClick={() => setEditingTopup(null)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveEditedTopup} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Jumlah Vote:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={topupFormData.jumlahVote}
                    onChange={e => setTopupFormData({ ...topupFormData, jumlahVote: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Nominal Transfer (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={topupFormData.hargaTotal}
                    onChange={e => setTopupFormData({ ...topupFormData, hargaTotal: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Nama Pengirim Rekening DANA:</label>
                <input
                  type="text"
                  required
                  value={topupFormData.pengirimNama}
                  onChange={e => setTopupFormData({ ...topupFormData, pengirimNama: e.target.value })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Status Verifikasi:</label>
                <select
                  value={topupFormData.status}
                  onChange={e => setTopupFormData({ ...topupFormData, status: e.target.value as any })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                >
                  <option value="pending">Pending (Menunggu)</option>
                  <option value="approved">Approved (Disetujui)</option>
                  <option value="rejected">Rejected (Ditolak)</option>
                </select>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Catatan Admin:</label>
                <textarea
                  rows={2}
                  value={topupFormData.catatanAdmin}
                  onChange={e => setTopupFormData({ ...topupFormData, catatanAdmin: e.target.value })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingTopup(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-bold rounded-lg shadow"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: KATEGORI VOTING (TAMBAH / EDIT) ----------------- */}
      {votingCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">
                {editingVotingCat ? 'Edit Kategori Voting' : 'Tambah Kategori Voting Baru'}
              </h3>
              <button onClick={() => setVotingCatModalOpen(false)} className="text-stone-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveVotingCat} className="space-y-3">
              <div>
                <label className="text-stone-300 block mb-1">Nama Kategori Voting:</label>
                <input
                  type="text"
                  required
                  value={votingCatFormData.nama}
                  onChange={e => setVotingCatFormData({ ...votingCatFormData, nama: e.target.value })}
                  placeholder="Contoh: Juara Terfavorit Pemirsa"
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Deskripsi Kategori:</label>
                <textarea
                  rows={2}
                  value={votingCatFormData.deskripsi}
                  onChange={e => setVotingCatFormData({ ...votingCatFormData, deskripsi: e.target.value })}
                  placeholder="Keterangan kategori voting..."
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Harga Per Suara Vote (Nominal IDR):</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  required
                  value={votingCatFormData.hargaPerVote}
                  onChange={e => setVotingCatFormData({ ...votingCatFormData, hargaPerVote: parseInt(e.target.value) || 5000 })}
                  className="w-full p-2 bg-stone-950 border border-stone-700 rounded-lg text-amber-300 font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catIsActive"
                  checked={votingCatFormData.isActive}
                  onChange={e => setVotingCatFormData({ ...votingCatFormData, isActive: e.target.checked })}
                  className="accent-amber-500 rounded"
                />
                <label htmlFor="catIsActive" className="text-stone-300 cursor-pointer">
                  Kategori aktif dan dapat dipilih pemirsa
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setVotingCatModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 text-white font-bold rounded-lg shadow"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Photo Inspection Modal */}
      {viewingProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-4 max-w-lg w-full text-center space-y-3">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h4 className="font-bold text-xs text-white">Bukti Screenshot Transfer DANA</h4>
              <button
                onClick={() => setViewingProofUrl(null)}
                className="text-stone-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>
            <img
              src={viewingProofUrl}
              alt="Bukti Transfer"
              className="max-h-[70vh] mx-auto rounded-lg object-contain shadow-lg"
            />
            <button
              onClick={() => setViewingProofUrl(null)}
              className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Inspect Submission Details Modal */}
      {inspectingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto text-xs text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
              <h3 className="font-bold text-sm text-white">Rincian Berkas Nilai Juri</h3>
              <button
                onClick={() => setInspectingSub(null)}
                className="text-stone-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-stone-400">Juri Penilai: <strong className="text-white">{inspectingSub.juriNama}</strong></div>
              <div className="text-stone-400">Waktu Pengerjaan Lomba: <strong className="text-amber-400 font-mono">{inspectingSub.waktuPengerjaanDetik} Detik</strong></div>
              <div className="text-stone-400">Total Nilai Bersih: <strong className="text-emerald-400 font-mono text-sm">{inspectingSub.totalNilai} Poin</strong></div>
            </div>

            <div className="border border-stone-800 rounded-lg p-3 space-y-2">
              <h4 className="font-bold text-stone-300">Rincian Skor Per Kriteria:</h4>
              {inspectingSub.nilaiKriteria?.map((nk, i) => (
                <div key={i} className="flex justify-between text-stone-300">
                  <span>Kriteria #{i + 1}:</span>
                  <span className="font-mono font-bold text-amber-300">{nk.nilai} Poin</span>
                </div>
              ))}
            </div>

            {inspectingSub.pelanggaranList && inspectingSub.pelanggaranList.length > 0 && (
              <div className="border border-red-900/60 rounded-lg p-3 space-y-1 bg-red-950/20">
                <h4 className="font-bold text-red-400">Pelanggaran & Pengurangan Nilai:</h4>
                {inspectingSub.pelanggaranList.map(p => (
                  <div key={p.id} className="flex justify-between text-red-300">
                    <span>{p.nama}</span>
                    <span className="font-mono">-{p.poinPengurangan}</span>
                  </div>
                ))}
              </div>
            )}

            {inspectingSub.catatanJuri && (
              <div className="p-3 bg-stone-950 rounded-lg border border-stone-800 text-stone-300 italic">
                "{inspectingSub.catatanJuri}"
              </div>
            )}

            {inspectingSub.tandaTanganUrl && (
              <div>
                <span className="text-stone-400 block mb-1">Tanda Tangan Digital Juri:</span>
                <img
                  src={inspectingSub.tandaTanganUrl}
                  alt="Tanda Tangan"
                  className="h-16 bg-white rounded p-1 border border-stone-600 object-contain"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setInspectingSub(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Interactive Confirmation Modal for Delete and Clear Actions */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-stone-900 border-2 border-stone-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs text-stone-100 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-stone-800 pb-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmModal.confirmStyle === 'danger'
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{confirmModal.title}</h3>
                <p className="text-[11px] text-stone-400">Konfirmasi tindakan penghapusan data</p>
              </div>
            </div>

            <p className="text-stone-300 leading-relaxed text-xs">
              {confirmModal.message}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  confirmModal.onConfirm();
                  closeConfirmDialog();
                }}
                className={`px-5 py-2 font-bold rounded-xl shadow cursor-pointer transition-all ${
                  confirmModal.confirmStyle === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                }`}
              >
                {confirmModal.confirmText || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Report View Modal */}
      {printModalOpen && (
        <PrintReportView
          mode={printMode}
          selectedMataLombaId={printSelectedMl}
          selectedPesertaId={printSelectedPst}
          includeFilledScores={printIncludeFilled}
          eventConfig={localConfig}
          onClose={() => setPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

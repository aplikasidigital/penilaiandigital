export type UserRole = 'super_admin' | 'shadow_admin' | 'juri' | 'voter' | 'publik';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  assignedMataLombaIds?: string[];
  voteBalance?: number;
  createdAt?: string;
}

export interface EventConfig {
  id?: string;
  judulKegiatan: string;
  subJudul: string;
  deskripsi: string;
  tempat: string;
  tanggalWaktu: string;
  penyelenggara: string;
  logoUrl?: string;
  backgroundUrl?: string;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  videoTeaserUrl?: string;
  bgmAudioUrl?: string;
  bgmEnabled?: boolean;
  bgmVolume?: number;
  peraturanLomba?: string[];
  nomorDanaAdmin?: string;
  namaAkunDana?: string;
  qrisImageUrl?: string;
  votingClosed?: boolean;
  danaTransferDisabled?: boolean;
  autoApproveWebhookEnabled?: boolean;
  updatedAt?: string;
}

export interface KriteriaPenilaian {
  id: string;
  mataLombaId: string;
  nama: string;
  deskripsi: string;
  tipe: 'checkbox' | 'number';
  nilaiMaksimal: number;
}

export interface MataLomba {
  id: string;
  kode: string;
  nama: string;
  kategori?: string;
  deskripsi?: string;
  lokasi?: string;
  jadwal?: string;
  durasiMaksimalMenit: number;
  durasiTargetDetik: number;
  assignedJuriIds: string[];
  icon?: string;
  kriteriaList: KriteriaPenilaian[];
  createdAt?: string;
}

export interface Peserta {
  id: string;
  nomorUrut: number;
  nomorDada: string;
  nama: string;
  asalInstansi: string;
  mataLombaId: string;
  mataLombaIds?: string[];
  kategori?: string;
  kontak?: string;
  fotoUrl?: string;
  createdAt?: string;
}

export interface ItemNilaiKriteria {
  kriteriaId: string;
  nilai: number;
  checkedIndices?: number[];
}

export interface PelanggaranEntry {
  id: string;
  nama: string;
  poinPengurangan: number;
}

export interface NilaiSubmission {
  id: string;
  mataLombaId: string;
  pesertaId: string;
  juriId: string;
  juriNama: string;
  waktuPengerjaanDetik: number;
  nilaiKriteria: ItemNilaiKriteria[];
  pelanggaranList: PelanggaranEntry[];
  totalPengurangan: number;
  totalNilai: number;
  catatanJuri: string;
  tandaTanganUrl: string;
  paktaIntegritasDisetujui?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface VotingCategory {
  id: string;
  nama: string;
  deskripsi?: string;
  hargaPerVote: number;
  mataLombaId?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface TopupRequest {
  id: string;
  voterId: string;
  voterNama: string;
  jumlahVote: number;
  hargaTotal: number;
  metode: string;
  nomorDanaTujuan: string;
  buktiTransferUrl: string;
  pengirimNama: string;
  pengirimNomorHp?: string;
  status: 'pending' | 'approved' | 'rejected';
  catatanAdmin?: string;
  createdAt?: string;
  approvedAt?: string;
}

export interface VoteRecord {
  id: string;
  votingCategoryId: string;
  voterId: string;
  pesertaId: string;
  jumlahVote: number;
  createdAt?: string;
}

export interface RankingParticipant {
  peserta: Peserta;
  mataLomba: MataLomba;
  submissions: NilaiSubmission[];
  jumlahJuriMenilai: number;
  rataRataNilai: number;
  rataRataWaktuDetik: number;
  rank: number;
  isApprovedComplete: boolean;
  predikatJuara?: string;
}

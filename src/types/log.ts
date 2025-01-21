export interface Lowongan {
  No: string;
  'Mata Kuliah': string;
  Semester: string;
  'Tahun Ajaran': string;
  Dosen: string;
  'Log Asisten Link': string;
  LogID: string;
  'Create Log Link'?: string;
  'Create Log Link ID'?: string;
}

export interface Log {
  No: string;
  Tanggal: string;
  'Jam Mulai': string;
  'Jam Selesai': string;
  'Durasi (Menit)': number;
  Kategori: string;
  'Deskripsi Tugas': string;
  Status: string;
  Operation: string;
  'Pesan Link': string;
  LogID: string;
  'Mata Kuliah'?: string;
}

export interface LogFormData {
  kategori_log: string;
  deskripsi: string;
  tanggal: {
    day: string;
    month: string;
    year: string;
  };
  waktu_mulai: {
    hour: string;
    minute: string;
  };
  waktu_selesai: {
    hour: string;
    minute: string;
  };
}
export interface Lowongan {
  No: string;
  'Mata Kuliah': string;
  Semester: string;
  'Tahun Ajaran': string;
  Dosen: string;
  'Log Asisten Link': string;
  LogID: string;
  'Create Log Link'?: string;
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

export const LOG_CATEGORIES = {
  "1": "Asistensi/Tutorial",
  "2": "Mengoreksi",
  "3": "Mengawas",
  "5": "Persiapan Asistensi",
  "6": "Membuat soal/tugas",
  "7": "Rapat",
  "8": "Sit in Kelas",
  "9": "Pengembangan Materi",
  "10": "Pengembangan apps",
  "11": "Persiapan infra",
  "12": "Dokumentasi",
  "13": "Persiapan kuliah",
  "14": "Penunjang",
  "15": "Input Data"
} as const;
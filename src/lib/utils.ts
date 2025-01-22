export function checkTimeOverlap(
  date1: string,
  startTime1: string,
  endTime1: string,
  date2: string,
  startTime2: string,
  endTime2: string
): boolean {
  // Convert dates and times to comparable format
  const [day1, month1, year1] = date1.split('-').map(Number);
  const [day2, month2, year2] = date2.split('-').map(Number);
  
  const start1 = new Date(year1, month1 - 1, day1, ...startTime1.split(':').map(Number));
  const end1 = new Date(year1, month1 - 1, day1, ...endTime1.split(':').map(Number));
  const start2 = new Date(year2, month2 - 1, day2, ...startTime2.split(':').map(Number));
  const end2 = new Date(year2, month2 - 1, day2, ...endTime2.split(':').map(Number));

  return start1 < end2 && start2 < end1;
}

export interface OverlapInfo {
  log1: {
    date: string;
    startTime: string;
    endTime: string;
    course: string;
    description: string;
  };
  log2: {
    date: string;
    startTime: string;
    endTime: string;
    course: string;
    description: string;
  };
}

export function findOverlappingLogs(logs: any[]): OverlapInfo[] {
  const overlaps: OverlapInfo[] = [];
  
  for (let i = 0; i < logs.length; i++) {
    for (let j = i + 1; j < logs.length; j++) {
      const log1 = logs[i];
      const log2 = logs[j];
      
      if (checkTimeOverlap(
        log1.Tanggal,
        log1['Jam Mulai'],
        log1['Jam Selesai'],
        log2.Tanggal,
        log2['Jam Mulai'],
        log2['Jam Selesai']
      )) {
        overlaps.push({
          log1: {
            date: log1.Tanggal,
            startTime: log1['Jam Mulai'],
            endTime: log1['Jam Selesai'],
            course: log1['Mata Kuliah'],
            description: log1['Deskripsi Tugas']
          },
          log2: {
            date: log2.Tanggal,
            startTime: log2['Jam Mulai'],
            endTime: log2['Jam Selesai'],
            course: log2['Mata Kuliah'],
            description: log2['Deskripsi Tugas']
          }
        });
      }
    }
  }
  
  return overlaps;
}
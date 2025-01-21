import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { parse } from 'node-html-parser';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const app = express();
const port = 3001;

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['set-cookie']
}));
app.use(express.json());

const SIASISTEN_URL = 'https://siasisten.cs.ui.ac.id';

const COMMON_HEADERS = {
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.6533.100 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Sec-Ch-Ua": "\"Chromium\";v=\"127\", \"Not)A;Brand\";v=\"99\"",
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": "\"Windows\"",
  "Accept-Language": "en-US",
  "Accept-Encoding": "gzip, deflate, br"
};

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const loginPageResponse = await axios.get(`${SIASISTEN_URL}/login/`, {
      headers: COMMON_HEADERS
    });

    const cookies = loginPageResponse.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(cookie => cookie.includes('csrftoken'));
    if (!csrfCookie) {
      throw new Error('No CSRF cookie received');
    }

    const csrftoken = csrfCookie.split(';')[0].split('=')[1];
    const html = loginPageResponse.data;
    const csrfMatch = html.match(/name=['"]csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/);
    if (!csrfMatch) {
      throw new Error('Failed to get CSRF token from form');
    }

    const csrfmiddlewaretoken = csrfMatch[1];

    const loginResponse = await axios.post(
        `${SIASISTEN_URL}/login/`,
        new URLSearchParams({
          csrfmiddlewaretoken,
          username,
          password,
          next: ''
        }).toString(),
        {
          headers: {
            ...COMMON_HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": `csrftoken=${csrftoken}`,
            "Referer": `${SIASISTEN_URL}/login/`,
            "Origin": SIASISTEN_URL
          },
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400
        }
    );

    if (loginResponse.status === 302) {
      const sessionCookies = loginResponse.headers['set-cookie'];
      const sessionCookie = sessionCookies?.find(cookie => cookie.includes('sessionid'));

      if (!sessionCookie) {
        throw new Error('No session cookie received');
      }

      const sessionId = sessionCookie.split(';')[0].split('=')[1];
      res.json({
        success: true,
        user: {
          username,
          sessionId,
          csrfToken: csrftoken
        }
      });
    } else {
      throw new Error('Invalid credentials');
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/lowongan', async (req, res) => {
  try {
    const sessionid = req.headers.cookie?.match(/sessionid=([^;]+)/)?.[1];
    const csrftoken = req.headers.cookie?.match(/csrftoken=([^;]+)/)?.[1];

    if (!sessionid || !csrftoken) {
      throw new Error('Session cookies not found');
    }

    const response = await axios.get(`${SIASISTEN_URL}/log/listLowonganAst`, {
      headers: {
        ...COMMON_HEADERS,
        Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
        Referer: SIASISTEN_URL,
      },
    });

    const root = parse(response.data);
    const rows = root.querySelectorAll('table tr');
    const lowongan = rows.slice(1).map(row => {
      const cols = row.querySelectorAll('td');
      return {
        No: cols[0].text.trim(),
        'Mata Kuliah': cols[1].text.trim(),
        Semester: cols[2].text.trim(),
        'Tahun Ajaran': cols[3].text.trim(),
        Dosen: cols[4].text.trim(),
        'Log Asisten Link': cols[5].querySelector('a').getAttribute('href'),
        LogID: cols[5].querySelector('a').getAttribute('href').split('/').slice(-2)[0]
      };
    });

    res.json(lowongan);
  } catch (error) {
    console.error('Error in /api/lowongan:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { sessionid, csrftoken } = req.headers.cookie.split(';').reduce((acc, curr) => {
      const [key, value] = curr.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    // First get the create log link
    const logPageResponse = await axios.get(`${SIASISTEN_URL}/log/listLogMahasiswa/${logId}/`, {
      headers: {
        ...COMMON_HEADERS,
        Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
        Referer: SIASISTEN_URL,
      },
    });

    const root = parse(logPageResponse.data);
    const createLogForm = root.querySelector('form[action]');
    const createLogLink = createLogForm ? createLogForm.getAttribute('action') : null;

    // Then get the logs
    const rows = root.querySelectorAll('table tr');
    const logs = rows.slice(1).map(row => {
      const cols = row.querySelectorAll('td');
      const jamStr = cols[2].text.trim();
      const [jamRange] = jamStr.split('\n');
      const [jamMulai, jamSelesai] = jamRange.split('-').map(t => t.trim());
      const durasi = calculateDuration(jamMulai, jamSelesai);

      return {
        No: cols[0].text.trim(),
        Tanggal: formatDate(cols[1].text.trim()),
        'Jam Mulai': jamMulai,
        'Jam Selesai': jamSelesai,
        'Durasi (Menit)': durasi,
        Kategori: cols[3].text.trim(),
        'Deskripsi Tugas': cols[4].text.trim(),
        Status: cols[5].text.trim(),
        Operation: cols[6].text.trim(),
        'Pesan Link': cols[7].querySelector('a')?.getAttribute('href') || '',
        LogID: cols[7].querySelector('a')?.getAttribute('href')?.split('/').slice(-2)[0] || '',
      };
    });

    res.json({
      logs,
      createLogLink
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

function formatDate(dateStr) {
  const [day, month, year] = dateStr.split(' ');
  const monthMap = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  return `${day}-${monthMap[month]}-${year}`;
}

function calculateDuration(start, end) {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  const durationMinutes = ((endHour * 60 + endMin) - (startHour * 60 + startMin));
  return durationMinutes >= 0 ? durationMinutes : (24 * 60) + durationMinutes;
}

app.post('/api/logs/create/:createLogId', async (req, res) => {
  try {
    const { createLogId } = req.params;
    const { sessionId, csrfToken, ...formData } = req.body;

    const data = new URLSearchParams();
    data.append('csrfmiddlewaretoken', csrfToken);
    data.append('kategori_log', formData.kategori_log);
    data.append('deskripsi', formData.deskripsi);
    data.append('tanggal_day', formData.tanggal.day);
    data.append('tanggal_month', formData.tanggal.month);
    data.append('tanggal_year', formData.tanggal.year);
    data.append('waktu_mulai_hour', formData.waktu_mulai.hour);
    data.append('waktu_mulai_minute', formData.waktu_mulai.minute);
    data.append('waktu_selesai_hour', formData.waktu_selesai.hour);
    data.append('waktu_selesai_minute', formData.waktu_selesai.minute);

    await axios.post(
        `${SIASISTEN_URL}/log/create/${createLogId}/`,
        data.toString(),
        {
          headers: {
            ...COMMON_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `csrftoken=${csrfToken}; sessionid=${sessionId}`,
            'X-CSRFToken': csrfToken,
            'Referer': `${SIASISTEN_URL}/log/create/${createLogId}/`,
            'Origin': SIASISTEN_URL
          }
        }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ success: false, error: 'Failed to create log' });
  }
});

app.put('/api/logs/update/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { sessionId, csrfToken, ...formData } = req.body;

    const data = new URLSearchParams();
    data.append('csrfmiddlewaretoken', csrfToken);
    data.append('kategori_log', formData.kategori_log);
    data.append('deskripsi', formData.deskripsi);
    data.append('tanggal_day', formData.tanggal.day);
    data.append('tanggal_month', formData.tanggal.month);
    data.append('tanggal_year', formData.tanggal.year);
    data.append('waktu_mulai_hour', formData.waktu_mulai.hour);
    data.append('waktu_mulai_minute', formData.waktu_mulai.minute);
    data.append('waktu_selesai_hour', formData.waktu_selesai.hour);
    data.append('waktu_selesai_minute', formData.waktu_selesai.minute);

    await axios.post(
        `${SIASISTEN_URL}/log/update/${logId}/`,
        data.toString(),
        {
          headers: {
            ...COMMON_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `csrftoken=${csrfToken}; sessionid=${sessionId}`,
            'X-CSRFToken': csrfToken,
            'Referer': `${SIASISTEN_URL}/log/update/${logId}/`,
            'Origin': SIASISTEN_URL
          }
        }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ success: false, error: 'Failed to update log' });
  }
});

app.delete('/api/logs/delete/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { sessionId, csrfToken } = req.body;

    const data = new URLSearchParams();
    data.append('csrfmiddlewaretoken', csrfToken);

    await axios.post(
        `${SIASISTEN_URL}/log/delete/${logId}/`,
        data.toString(),
        {
          headers: {
            ...COMMON_HEADERS,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': `csrftoken=${csrfToken}; sessionid=${sessionId}`,
            'X-CSRFToken': csrfToken,
            'Referer': `${SIASISTEN_URL}/log/delete/${logId}/`,
            'Origin': SIASISTEN_URL
          }
        }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).json({ success: false, error: 'Failed to delete log' });
  }
});

app.post('/api/finance', async (req, res) => {
  try {
    const { year, month } = req.body;
    const sessionid = req.headers.cookie?.match(/sessionid=([^;]+)/)?.[1];
    const csrftoken = req.headers.cookie?.match(/csrftoken=([^;]+)/)?.[1];
    const username = req.headers.cookie?.match(/username=([^;]+)/)?.[1];

    if (!sessionid || !csrftoken || !username) {
      throw new Error('Session cookies not found');
    }

    // First check if we have data in the database
    const { data: dbData, error: dbError } = await supabase
        .from('finance_data')
        .select('*')
        .eq('username', decodeURIComponent(username))
        .eq('year', year)
        .eq('month', month);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Database error');
    }

    // For current month and previous 2 months, always fetch fresh data
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const isRecentMonth = (
        year === currentYear && month >= currentMonth - 2 && month <= currentMonth
    ) || (
        year === currentYear - 1 &&
        month >= 12 - (2 - (currentMonth - 1)) &&
        currentMonth <= 2
    );

    if (!isRecentMonth && dbData && dbData.length > 0) {
      // Return cached data for older months
      return res.json(dbData.map(item => ({
        NPM: item.npm,
        Asisten: item.asisten,
        Bulan: item.bulan,
        Mata_Kuliah: item.mata_kuliah,
        Jumlah_Jam: item.jumlah_jam,
        Honor_Per_Jam: item.honor_per_jam,
        Jumlah_Pembayaran: item.jumlah_pembayaran,
        Status: item.status
      })));
    }

    const keuangan_url = "https://siasisten.cs.ui.ac.id/keuangan/listPembayaranPerAsisten";
    const response = await axios.post(
        keuangan_url,
        new URLSearchParams({
          csrfmiddlewaretoken: csrftoken,
          tahun: year.toString(),
          bulan: month.toString(),
          username: decodeURIComponent(username),
          statusid: "-1"
        }).toString(),
        {
          headers: {
            ...COMMON_HEADERS,
            "Host": "siasisten.cs.ui.ac.id",
            "Cookie": `csrftoken=${csrftoken}; sessionid=${sessionid}; sc_is_visitor_unique=rx12339556.1727594531.5DDD9564D24F4F8716FA6F31A7C077FC.2.2.2.2.2.2.2.2.2`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "max-age=0",
            "Origin": "https://siasisten.cs.ui.ac.id",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document",
            "Referer": keuangan_url
          },
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400
        }
    );

    const root = parse(response.data);
    const tables = root.querySelectorAll('table');
    const data = [];

    for (const table of tables) {
      const headers = table.querySelectorAll('th').map(th => th.text.trim());
      if (headers.includes('NPM') && headers.includes('Asisten')) {
        const rows = table.querySelectorAll('tr');
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].querySelectorAll('td');
          if (cols.length === 8) {
            const entry = {
              NPM: cols[0].text.trim(),
              Asisten: cols[1].text.trim(),
              Bulan: cols[2].text.trim(),
              Mata_Kuliah: cols[3].text.trim(),
              Jumlah_Jam: cols[4].text.trim(),
              Honor_Per_Jam: cols[5].text.trim(),
              Jumlah_Pembayaran: cols[6].text.trim(),
              Status: cols[7].text.trim()
            };
            data.push(entry);

            // Update or insert into database
            const { error: upsertError } = await supabase
                .from('finance_data')
                .upsert({
                  username: decodeURIComponent(username),
                  year,
                  month,
                  npm: entry.NPM,
                  asisten: entry.Asisten,
                  bulan: entry.Bulan,
                  mata_kuliah: entry.Mata_Kuliah,
                  jumlah_jam: entry.Jumlah_Jam,
                  honor_per_jam: entry.Honor_Per_Jam,
                  jumlah_pembayaran: entry.Jumlah_Pembayaran,
                  status: entry.Status
                });

            if (upsertError) {
              console.error('Error upserting data:', upsertError);
            }
          }
        }
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Error in /api/finance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/finance/all', async (req, res) => {
  try {
    const sessionid = req.headers.cookie?.match(/sessionid=([^;]+)/)?.[1];
    const csrftoken = req.headers.cookie?.match(/csrftoken=([^;]+)/)?.[1];
    const username = req.headers.cookie?.match(/username=([^;]+)/)?.[1];

    if (!sessionid || !csrftoken || !username) {
      throw new Error('Session cookies not found');
    }

    const decodedUsername = decodeURIComponent(username);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Get all data from database first
    const { data: dbData, error: dbError } = await supabase
        .from('finance_data')
        .select('*')
        .eq('username', decodedUsername);

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Database error');
    }

    // Delete data for the last 3 months
    const monthsToDelete = [];
    for (let i = 0; i < 3; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      monthsToDelete.push({ year, month });
    }

    // Delete recent months' data
    for (const { year, month } of monthsToDelete) {
      const { error: deleteError } = await supabase
          .from('finance_data')
          .delete()
          .eq('username', decodedUsername)
          .eq('year', year)
          .eq('month', month);

      if (deleteError) {
        console.error('Error deleting data:', deleteError);
      }
    }

    // If no data in database, fetch all historical data from 2021
    if (!dbData || dbData.length === 0) {
      const startYear = 2021;
      const allData = [];

      // Fetch all historical data
      for (let year = startYear; year <= currentYear; year++) {
        const maxMonth = year === currentYear ? currentMonth : 12;
        for (let month = 1; month <= maxMonth; month++) {
          try {
            const response = await fetchFinanceData(year, month, decodedUsername, sessionid, csrftoken);
            if (response.length > 0) {
              allData.push(...response);

              // Insert into database
              for (const entry of response) {
                await supabase
                    .from('finance_data')
                    .upsert({
                      username: decodedUsername,
                      year,
                      month,
                      npm: entry.NPM,
                      asisten: entry.Asisten,
                      bulan: entry.Bulan,
                      mata_kuliah: entry.Mata_Kuliah,
                      jumlah_jam: entry.Jumlah_Jam,
                      honor_per_jam: entry.Honor_Per_Jam,
                      jumlah_pembayaran: entry.Jumlah_Pembayaran,
                      status: entry.Status
                    });
              }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error fetching data for ${year}-${month}:`, error);
          }
        }
      }

      return res.json(allData);
    }

    // Fetch fresh data for recent months
    const recentData = [];
    for (const { year, month } of monthsToDelete) {
      try {
        const response = await fetchFinanceData(year, month, decodedUsername, sessionid, csrftoken);
        if (response.length > 0) {
          recentData.push(...response);

          // Insert fresh data into database
          for (const entry of response) {
            await supabase
                .from('finance_data')
                .upsert({
                  username: decodedUsername,
                  year,
                  month,
                  npm: entry.NPM,
                  asisten: entry.Asisten,
                  bulan: entry.Bulan,
                  mata_kuliah: entry.Mata_Kuliah,
                  jumlah_jam: entry.Jumlah_Jam,
                  honor_per_jam: entry.Honor_Per_Jam,
                  jumlah_pembayaran: entry.Jumlah_Pembayaran,
                  status: entry.Status
                });
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error fetching recent data for ${year}-${month}:`, error);
      }
    }

    // Combine historical data with fresh data
    const historicalData = dbData.filter(entry => {
      const isRecentMonth = monthsToDelete.some(
          m => m.year === entry.year && m.month === entry.month
      );
      return !isRecentMonth;
    });

    const combinedData = [
      ...historicalData.map(entry => ({
        NPM: entry.npm,
        Asisten: entry.asisten,
        Bulan: entry.bulan,
        Mata_Kuliah: entry.mata_kuliah,
        Jumlah_Jam: entry.jumlah_jam,
        Honor_Per_Jam: entry.honor_per_jam,
        Jumlah_Pembayaran: entry.jumlah_pembayaran,
        Status: entry.status
      })),
      ...recentData
    ];

    res.json(combinedData);
  } catch (error) {
    console.error('Error in /api/finance/all:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to fetch finance data from siasisten
async function fetchFinanceData(year, month, username, sessionid, csrftoken) {
  const keuangan_url = "https://siasisten.cs.ui.ac.id/keuangan/listPembayaranPerAsisten";
  const response = await axios.post(
      keuangan_url,
      new URLSearchParams({
        csrfmiddlewaretoken: csrftoken,
        tahun: year.toString(),
        bulan: month.toString(),
        username: username,
        statusid: '-1'
      }).toString(),
      {
        headers: {
          ...COMMON_HEADERS,
          "Host": "siasisten.cs.ui.ac.id",
          "Cookie": `csrftoken=${csrftoken}; sessionid=${sessionid}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Origin": "https://siasisten.cs.ui.ac.id",
          "Referer": keuangan_url
        }
      }
  );

  const root = parse(response.data);
  const tables = root.querySelectorAll('table');
  const data = [];

  for (const table of tables) {
    const headers = table.querySelectorAll('th').map(th => th.text.trim());
    if (headers.includes('NPM') && headers.includes('Asisten')) {
      const rows = table.querySelectorAll('tr');
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].querySelectorAll('td');
        if (cols.length === 8) {
          data.push({
            NPM: cols[0].text.trim(),
            Asisten: cols[1].text.trim(),
            Bulan: cols[2].text.trim(),
            Mata_Kuliah: cols[3].text.trim(),
            Jumlah_Jam: cols[4].text.trim(),
            Honor_Per_Jam: cols[5].text.trim(),
            Jumlah_Pembayaran: cols[6].text.trim(),
            Status: cols[7].text.trim()
          });
        }
      }
    }
  }

  return data;
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
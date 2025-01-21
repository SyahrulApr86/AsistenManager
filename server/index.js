import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { parse } from 'node-html-parser';

const app = express();
const port = 3001;

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

    // First request to get the CSRF token
    const loginPageResponse = await axios.get(`${SIASISTEN_URL}/login/`, {
      headers: COMMON_HEADERS
    });

    // Get cookies from response headers
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

    // Perform login with the obtained CSRF token
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

// Get lowongan endpoint
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
        LogID: cols[5].querySelector('a').getAttribute('href').split('/').slice(-2)[0],
      };
    });

    res.json(lowongan);
  } catch (error) {
    console.error('Error in /api/lowongan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get logs endpoint
app.get('/api/logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { sessionid, csrftoken } = req.headers.cookie.split(';').reduce((acc, curr) => {
      const [key, value] = curr.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const response = await axios.get(`${SIASISTEN_URL}/log/listLogMahasiswa/${logId}/`, {
      headers: {
        ...COMMON_HEADERS,
        Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
        Referer: SIASISTEN_URL,
      },
    });

    const root = parse(response.data);
    const rows = root.querySelectorAll('table tr');
    const logs = rows.slice(1).map(row => {
      const cols = row.querySelectorAll('td');
      const jamStr = cols[2].text.trim(); // Jam Mulai - Jam Selesai + Deskripsi tambahan
      const [jamRange] = jamStr.split('\n'); // Hanya ambil bagian waktu
      const [jamMulai, jamSelesai] = jamRange.split('-').map(t => t.trim()); // Pisah Jam Mulai dan Jam Selesai
      const durasi = calculateDuration(jamMulai, jamSelesai); // Hitung durasi menit

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

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Helper functions
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

  // Jika jam selesai lebih kecil dari jam mulai, asumsi melewati tengah malam
  const durationMinutes = ((endHour * 60 + endMin) - (startHour * 60 + startMin));
  return durationMinutes >= 0 ? durationMinutes : (24 * 60) + durationMinutes;
}

// Create log endpoint
app.post('/api/logs/create/:createLogId', async (req, res) => {
  try {
    const { createLogId } = req.params;
    const { sessionid, csrftoken } = req.headers.cookie.split(';').reduce((acc, curr) => {
      const [key, value] = curr.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const response = await axios.post(
      `${SIASISTEN_URL}/log/create/${createLogId}/`,
      req.body,
      {
        headers: {
          ...COMMON_HEADERS,
          Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
          'X-CSRFToken': req.headers['x-csrftoken'],
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: `${SIASISTEN_URL}/log/create/${createLogId}/`,
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

// Update log endpoint
app.put('/api/logs/update/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { sessionid, csrftoken } = req.headers.cookie.split(';').reduce((acc, curr) => {
      const [key, value] = curr.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const response = await axios.post(
      `${SIASISTEN_URL}/log/update/${logId}/`,
      req.body,
      {
        headers: {
          ...COMMON_HEADERS,
          Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
          'X-CSRFToken': req.headers['x-csrftoken'],
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: `${SIASISTEN_URL}/log/update/${logId}/`,
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// Delete log endpoint
app.delete('/api/logs/delete/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const { sessionid, csrftoken } = req.headers.cookie.split(';').reduce((acc, curr) => {
      const [key, value] = curr.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const response = await axios.post(
      `${SIASISTEN_URL}/log/delete/${logId}/`,
      { csrfmiddlewaretoken: req.headers['x-csrftoken'] },
      {
        headers: {
          ...COMMON_HEADERS,
          Cookie: `sessionid=${sessionid}; csrftoken=${csrftoken}`,
          'X-CSRFToken': req.headers['x-csrftoken'],
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: `${SIASISTEN_URL}/log/delete/${logId}/`,
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting log:', error);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
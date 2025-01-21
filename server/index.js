import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = 3001;

app.use(cors());
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
    console.log('Attempting login for username:', username);

    // First request to get the CSRF token
    const loginPageResponse = await fetch(`${SIASISTEN_URL}/login/`, {
      headers: {
        ...COMMON_HEADERS,
        "Referer": SIASISTEN_URL,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document"
      }
    });

    console.log('Login page response status:', loginPageResponse.status);
    
    const cookies = loginPageResponse.headers.raw()['set-cookie'] || [];
    console.log('Initial cookies:', cookies);

    const csrfCookie = cookies.find(cookie => cookie.includes('csrftoken'));
    if (!csrfCookie) {
      throw new Error('No CSRF cookie received');
    }

    const csrftoken = csrfCookie.split(';')[0].split('=')[1];
    console.log('CSRF Token from cookie:', csrftoken);

    const html = await loginPageResponse.text();
    const csrfMatch = html.match(/name=['"]csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/);
    if (!csrfMatch) {
      throw new Error('Failed to get CSRF token from form');
    }

    const csrfmiddlewaretoken = csrfMatch[1];
    console.log('CSRF Token from form:', csrfmiddlewaretoken);

    // Perform login with the obtained CSRF token
    const loginResponse = await fetch(`${SIASISTEN_URL}/login/`, {
      method: 'POST',
      headers: {
        ...COMMON_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `csrftoken=${csrftoken}`,
        "Referer": `${SIASISTEN_URL}/login/`,
        "Origin": SIASISTEN_URL,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document"
      },
      body: new URLSearchParams({
        csrfmiddlewaretoken,
        username,
        password,
        next: ''
      }).toString(),
      redirect: 'manual'
    });

    console.log('Login response status:', loginResponse.status);
    console.log('Login response headers:', loginResponse.headers.raw());

    if (loginResponse.status === 302) {
      const sessionCookies = loginResponse.headers.raw()['set-cookie'];
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
      const responseText = await loginResponse.text();
      console.log('Login failed response:', responseText);
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

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
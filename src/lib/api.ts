import axios from 'axios';
import { Lowongan, Log, LogFormData } from '../types/log';

const API_URL = 'http://localhost:3001/api';

export async function getLowongan(sessionId: string, csrfToken: string): Promise<Lowongan[]> {
  const response = await axios.get(`${API_URL}/lowongan`, {
    headers: {
      'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
    },
  });
  return response.data;
}

export async function getLogs(sessionId: string, csrfToken: string, logId: string): Promise<Log[]> {
  const response = await axios.get(`${API_URL}/logs/${logId}`, {
    headers: {
      'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
    },
  });
  return response.data;
}

export async function createLog(
  sessionId: string, 
  csrfToken: string, 
  createLogId: string, 
  data: LogFormData
): Promise<void> {
  await axios.post(`${API_URL}/logs/create/${createLogId}`, data, {
    headers: {
      'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
      'X-CSRFToken': csrfToken,
    },
  });
}

export async function updateLog(
  sessionId: string, 
  csrfToken: string, 
  logId: string, 
  data: LogFormData
): Promise<void> {
  await axios.put(`${API_URL}/logs/update/${logId}`, data, {
    headers: {
      'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
      'X-CSRFToken': csrfToken,
    },
  });
}

export async function deleteLog(
  sessionId: string, 
  csrfToken: string, 
  logId: string
): Promise<void> {
  await axios.delete(`${API_URL}/logs/delete/${logId}`, {
    headers: {
      'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
      'X-CSRFToken': csrfToken,
    },
  });
}
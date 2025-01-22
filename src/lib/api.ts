import axios from 'axios';
import { Lowongan, Log, LogFormData, FinanceData } from '../types/log';

const API_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

export async function getLowongan(sessionId: string, csrfToken: string): Promise<Lowongan[]> {
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;

  const response = await api.get('/lowongan');
  return response.data;
}

export async function getLogs(sessionId: string, csrfToken: string, logId: string): Promise<{ logs: Log[], createLogLink: string | null }> {
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;

  const response = await api.get(`/logs/${logId}`);
  return response.data;
}

export async function createLog(
  sessionId: string,
  csrfToken: string,
  createLogId: string,
  data: LogFormData
): Promise<void> {
  // Extract the ID from the createLogId (which might be a full URL path)
  const id = createLogId.split('/').filter(Boolean).pop();

  if (!id) {
    throw new Error('Invalid create log ID');
  }

  const response = await api.post(`/logs/create/${id}`, {
    sessionId,
    csrfToken,
    ...data
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create log');
  }
}

export async function updateLog(
  sessionId: string,
  csrfToken: string,
  logId: string,
  data: LogFormData
): Promise<void> {
  const response = await api.put(`/logs/update/${logId}`, {
    sessionId,
    csrfToken,
    ...data
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update log');
  }
}

export async function deleteLog(
  sessionId: string,
  csrfToken: string,
  logId: string
): Promise<void> {
  const response = await api.delete(`/logs/delete/${logId}`, {
    data: {
      sessionId,
      csrfToken
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete log');
  }
}

export async function getFinanceData(
  sessionId: string,
  csrfToken: string,
  year: number,
  month: number
): Promise<FinanceData[]> {
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;

  const response = await api.post('/finance', {
    year,
    month
  });
  return response.data;
}
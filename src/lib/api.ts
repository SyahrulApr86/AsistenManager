import axios from 'axios';
import { Lowongan, Log, LogFormData } from '../types/log';

const API_URL = 'http://localhost:3001/api';

// Create axios instance with default config
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
  const response = await api.post(`/logs/create/${createLogId}`, {
    ...data,
    sessionId,
    csrfToken
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
    ...data,
    sessionId,
    csrfToken
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
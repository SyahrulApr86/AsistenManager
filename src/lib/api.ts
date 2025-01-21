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
  console.log('Making request with cookies:', { sessionId, csrfToken });
  
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;
  
  const response = await api.get('/lowongan');
  console.log('Response data:', response.data);
  return response.data;
}

export async function getLogs(sessionId: string, csrfToken: string, logId: string): Promise<Log[]> {
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
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;
  
  await api.post(`/logs/create/${createLogId}`, data);
}

export async function updateLog(
  sessionId: string, 
  csrfToken: string, 
  logId: string, 
  data: LogFormData
): Promise<void> {
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;
  
  await api.put(`/logs/update/${logId}`, data);
}

export async function deleteLog(
  sessionId: string, 
  csrfToken: string, 
  logId: string
): Promise<void> {
  document.cookie = `sessionid=${sessionId}; path=/`;
  document.cookie = `csrftoken=${csrfToken}; path=/`;
  
  await api.delete(`/logs/delete/${logId}`);
}
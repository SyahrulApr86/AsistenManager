export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  username: string;
  sessionId?: string;
  csrfToken?: string;
}
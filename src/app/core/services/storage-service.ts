import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  setAccessToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  setRefreshToken(token: string): void {
    localStorage.setItem('refresh_token', token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  clear(): void {
    localStorage.clear();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
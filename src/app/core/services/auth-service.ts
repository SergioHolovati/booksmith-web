import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { StorageService } from './storage-service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080';

  constructor(
    private storage: StorageService,
    private router: Router
  ) {}

  loginWithGoogle(): void {
    window.location.href =
      `${this.apiUrl}/oauth2/authorization/google`;
  }

  saveToken(
    token: string
  ): void {
    localStorage.setItem(
      'access_token',
      token
    );
  }


  logout(): void {
    this.storage.clear();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.storage.isAuthenticated();
  }


  getAccessToken():
    string | null {

      return localStorage.getItem(
        'access_token'
      );
    }
}
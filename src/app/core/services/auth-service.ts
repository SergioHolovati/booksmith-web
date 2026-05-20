import { Injectable }
from '@angular/core';

import { Router }
from '@angular/router';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  firstValueFrom
} from 'rxjs';

import { StorageService }
from './storage-service';

import { API_BASE }
from '../../config';

import { RegisterRequest }
from '../models/register-request';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private storage:
      StorageService,

    private router:
      Router,

    private http:
      HttpClient
  ) {}

  loginWithGoogle():
  void {

    window.location.href =
      `${API_BASE}/oauth2/authorization/google`;
  }

  saveToken(
    token: string
  ): void {

    localStorage.setItem(
      'access_token',
      token
    );
  }

  getAccessToken():
  string | null {

    return localStorage.getItem(
      'access_token'
    );
  }

  clearSession():
  void {

    this.storage.clear();
  }

  async login(
    email: string,
    password: string
  ): Promise<boolean> {

    try {

      const response:
        any =
        await firstValueFrom(

        this.http.post(
          `${API_BASE}/auth/login`,
          {
            email,
            password
          }
        )
      );

      const token =
        response?.token
        || response?.accessToken
        || response?.access_token
        || response;

      if (!token) {
        return false;
      }

      this.saveToken(
        token
      );

      return true;

    } catch {

      return false;
    }
  }

  async register(
    request:
      RegisterRequest
  ): Promise<boolean> {

    try {

      await firstValueFrom(

        this.http.post(
          `${API_BASE}/auth/register`,
          request
        )
      );

      return true;

    } catch {

      return false;
    }
  }

  refreshToken() {

    const token =
      this.getAccessToken();

    const headers =
      new HttpHeaders({
        Authorization:
          `Bearer ${token}`
      });

    return this.http.post<{
      token: string
    }>(
      `${API_BASE}/auth/refresh`,
      {},
      {
        headers
      }
    );
  }

async logout():
Promise<void> {

  try {

    await firstValueFrom(
      this.http.post(
        `${API_BASE}/auth/logout`,
        {}
      )
    );

  } catch (e) {

    console.error(
      'Logout failed',
      e
    );
  } finally {

    this.clearSession();

    this.router.navigate([
      '/login'
    ]);
  }
}

  isAuthenticated():
  boolean {

    return this.storage
      .isAuthenticated();
  }
  getUserContext():
any | null {

  const token =
    this.getAccessToken();

  if (!token) {
    return null;
  }

  try {

    const payload =
      JSON.parse(
        atob(
          token.split('.')[1]
        )
      );

    return payload;

  } catch (e) {

    console.error(
      'Error parsing token',
      e
    );

    return null;
  }
}

getAuthorId():
string | null {

  const userContext =
    this.getUserContext();

  const authorId =
    userContext?.authorId;

  if (
    !authorId ||
    authorId === '-'
  ) {

    return null;
  }

  return authorId;
}

isAuthor():
boolean {

  return !!this
    .getAuthorId();
}

getUserName():
string {

  const userContext =
    this.getUserContext();

  return (
    userContext
      ?.userName
    || 'User'
  );
}
}
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { API_BASE_URL } from './plant.service';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

const TOKEN_KEY = 'virtual_garden_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenValue = signal<string | null>(this.readToken());
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => Boolean(this.tokenValue() && this.currentUser()));
  readonly isContentManager = computed(() => this.hasAnyRole(['Admin', 'Manager']));
  readonly isAdmin = computed(() => this.currentUser()?.role === 'Admin');

  constructor() {
    if (this.tokenValue()) {
      this.loadMe().subscribe();
    }
  }

  get token() {
    return this.tokenValue();
  }

  login(email: string, password: string): Observable<AuthUser> {
    const body = new HttpParams().set('username', email).set('password', password);

    return this.http
      .post<TokenResponse>(`${API_BASE_URL}/auth/login`, body.toString(), {
        headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
      })
      .pipe(
        tap((response) => this.writeToken(response.access_token)),
        switchMap(() => this.loadMe())
      );
  }

  loadMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${API_BASE_URL}/auth/me`).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError((error: unknown) => {
        this.logout();
        throw error;
      })
    );
  }

  logout() {
    this.writeToken(null);
    this.currentUser.set(null);
  }

  hasAnyRole(roles: string[]) {
    const userRole = this.currentUser()?.role;
    return Boolean(userRole && roles.includes(userRole));
  }

  private readToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private writeToken(token: string | null) {
    this.tokenValue.set(token);
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Browser storage can be blocked in private contexts.
    }
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './plant.service';

export interface Role {
  id: number;
  name: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface UserCreatePayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${API_BASE_URL}/roles`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${API_BASE_URL}/users`);
  }

  createUser(payload: UserCreatePayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${API_BASE_URL}/users`, payload);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/users/${userId}`);
  }
}

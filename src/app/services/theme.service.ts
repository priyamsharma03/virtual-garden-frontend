import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'vmg-theme';
  private readonly currentTheme = signal<ThemeMode>('light');

  readonly theme = this.currentTheme.asReadonly();
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    const savedTheme = localStorage.getItem(this.storageKey) as ThemeMode | null;
    const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ?? (preferredDark ? 'dark' : 'light');

    this.setTheme(initialTheme);
  }

  toggleTheme() {
    this.setTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode) {
    this.currentTheme.set(theme);
    this.document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(this.storageKey, theme);
  }
}

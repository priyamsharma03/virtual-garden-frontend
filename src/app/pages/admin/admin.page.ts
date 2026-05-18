import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, AdminUser, Role } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { PlantService } from '../../services/plant.service';
import type { Plant } from '../../models/plant.model';
import { fadeInUp } from '../../shared/animations';

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  animations: [fadeInUp]
})
export class AdminPageComponent {
  protected readonly authService = inject(AuthService);
  private readonly plantService = inject(PlantService);
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly plants = toSignal(this.plantService.getPlants(), { initialValue: [] });
  protected readonly categories = toSignal(this.plantService.getCategories(), { initialValue: [] });
  protected readonly ayushSystems = toSignal(this.plantService.getAyushSystems(), { initialValue: [] });
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly selectedPlantId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly adminBusy = signal(false);
  protected readonly feedback = signal('');
  protected readonly error = signal('');
  private adminDataLoaded = false;

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['admin@example.com', [Validators.required, Validators.email]],
    password: ['change_me', Validators.required]
  });

  protected readonly plantForm = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    commonName: ['', Validators.required],
    scientificName: ['', Validators.required],
    category: ['', Validators.required],
    ayushSystem: [''],
    imageUrl: ['', Validators.required],
    modelUrl: [''],
    shortDescription: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.required],
    foundIn: ['', Validators.required],
    medicinalUses: ['', Validators.required]
  });

  protected readonly userForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Manager', Validators.required]
  });

  constructor() {
    effect(() => {
      if (this.authService.isAdmin() && !this.adminDataLoaded) {
        this.adminDataLoaded = true;
        this.loadTeamAccess();
      }
    });
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');
    const { email, password } = this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.feedback.set('Signed in. Plant management is ready.'),
        error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'Login failed'))
      });
  }

  logout() {
    this.authService.logout();
    this.feedback.set('');
    this.error.set('');
    this.users.set([]);
    this.roles.set([]);
    this.adminDataLoaded = false;
  }

  startCreate() {
    this.selectedPlantId.set(null);
    this.plantForm.reset({
      id: '',
      commonName: '',
      scientificName: '',
      category: '',
      ayushSystem: '',
      imageUrl: '',
      modelUrl: '',
      shortDescription: '',
      description: '',
      foundIn: '',
      medicinalUses: ''
    });
    this.feedback.set('');
    this.error.set('');
  }

  startEdit(plant: Plant) {
    this.selectedPlantId.set(plant.id);
    this.plantForm.setValue({
      id: plant.id,
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      category: plant.category,
      ayushSystem: plant.ayushSystem ?? '',
      imageUrl: plant.imageUrl,
      modelUrl: plant.modelUrl ?? '',
      shortDescription: plant.shortDescription,
      description: plant.description,
      foundIn: plant.foundIn.join('\n'),
      medicinalUses: plant.medicinalUses.join('\n')
    });
    this.feedback.set('');
    this.error.set('');
  }

  savePlant() {
    if (this.plantForm.invalid) {
      this.plantForm.markAllAsTouched();
      this.error.set('Please complete the required plant fields.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    const plant = this.buildPlantPayload();
    const selectedId = this.selectedPlantId();
    const request = selectedId
      ? this.plantService.updatePlant(selectedId, plant)
      : this.plantService.createPlant(plant);

    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (savedPlant) => {
        this.feedback.set(`${savedPlant.commonName} was saved successfully.`);
        this.startEdit(savedPlant);
      },
      error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'Plant could not be saved'))
    });
  }

  deletePlant(plant: Plant) {
    const confirmed = window.confirm(`Delete ${plant.commonName}? This keeps a soft-delete audit record.`);
    if (!confirmed) {
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.plantService
      .deletePlant(plant.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.feedback.set(`${plant.commonName} was removed from the catalog.`);
          this.startCreate();
        },
        error: (error: unknown) =>
          this.error.set(this.getErrorMessage(error, 'Plant could not be deleted'))
      });
  }

  createUser() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.adminBusy.set(true);
    this.adminService
      .createUser(this.userForm.getRawValue())
      .pipe(finalize(() => this.adminBusy.set(false)))
      .subscribe({
        next: () => {
          this.userForm.reset({ name: '', email: '', password: '', role: 'Manager' });
          this.loadTeamAccess();
          this.feedback.set('Team member added.');
        },
        error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'User could not be created'))
      });
  }

  deleteUser(user: AdminUser) {
    const confirmed = window.confirm(`Remove access for ${user.name}?`);
    if (!confirmed) {
      return;
    }

    this.adminBusy.set(true);
    this.adminService
      .deleteUser(user.id)
      .pipe(finalize(() => this.adminBusy.set(false)))
      .subscribe({
        next: () => {
          this.loadTeamAccess();
          this.feedback.set('Team member removed.');
        },
        error: (error: unknown) => this.error.set(this.getErrorMessage(error, 'User could not be removed'))
      });
  }

  private loadTeamAccess() {
    this.adminService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.users.set([])
    });

    this.adminService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([])
    });
  }

  private buildPlantPayload(): Plant {
    const value = this.plantForm.getRawValue();

    return {
      id: value.id.trim(),
      commonName: value.commonName.trim(),
      scientificName: value.scientificName.trim(),
      category: value.category.trim(),
      ayushSystem: value.ayushSystem.trim() || null,
      imageUrl: value.imageUrl.trim(),
      modelUrl: value.modelUrl.trim() || null,
      shortDescription: value.shortDescription.trim(),
      description: value.description.trim(),
      foundIn: this.toList(value.foundIn),
      medicinalUses: this.toList(value.medicinalUses)
    };
  }

  private toList(value: string): string[] {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') {
        return detail;
      }
    }

    return fallback;
  }
}

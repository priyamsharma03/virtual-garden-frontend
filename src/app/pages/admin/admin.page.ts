import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, AdminUser, Role } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { PlantService } from '../../services/plant.service';
import type { Plant } from '../../models/plant.model';
import { fadeInUp } from '../../shared/animations';
import { applyPlantImageFallback, resolvePlantImageUrl } from '../../shared/image-utils';

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  animations: [fadeInUp]
})
export class AdminPageComponent implements OnDestroy {
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
  protected readonly resolvePlantImageUrl = resolvePlantImageUrl;
  protected readonly imagePreviewUrl = signal(resolvePlantImageUrl(''));
  protected readonly selectedImageFiles = signal<File[]>([]);
  private adminDataLoaded = false;
  private currentImageUrl = '';
  private previewObjectUrl: string | null = null;

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['admin@example.com', [Validators.required, Validators.email]],
    password: ['change_me', Validators.required]
  });

  protected readonly plantForm = this.fb.nonNullable.group({
    commonName: ['', Validators.required],
    scientificName: ['', Validators.required],
    category: ['', Validators.required],
    ayushSystem: [''],
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
    this.selectedImageFiles.set([]);
    this.currentImageUrl = '';
    this.plantForm.reset({
      commonName: '',
      scientificName: '',
      category: '',
      ayushSystem: '',
      modelUrl: '',
      shortDescription: '',
      description: '',
      foundIn: '',
      medicinalUses: ''
    });
    this.setPreviewImage(resolvePlantImageUrl(''));
    this.feedback.set('');
    this.error.set('');
  }

  startEdit(plant: Plant) {
    this.selectedPlantId.set(plant.id);
    this.selectedImageFiles.set([]);
    this.currentImageUrl = plant.imageUrl;
    this.plantForm.setValue({
      commonName: plant.commonName,
      scientificName: plant.scientificName,
      category: plant.category,
      ayushSystem: plant.ayushSystem ?? '',
      modelUrl: plant.modelUrl ?? '',
      shortDescription: plant.shortDescription,
      description: plant.description,
      foundIn: plant.foundIn.join('\n'),
      medicinalUses: plant.medicinalUses.join('\n')
    });
    this.setPreviewImage(plant.imageUrl);
    this.feedback.set('');
    this.error.set('');
  }

  savePlant() {
    if (this.plantForm.invalid) {
      this.plantForm.markAllAsTouched();
      this.error.set('Please complete the required plant fields.');
      return;
    }

    if (!this.selectedImageFiles().length && !this.currentImageUrl) {
      this.error.set('Please upload a plant image.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    const payload = this.buildPlantPayload();
    const selectedId = this.selectedPlantId();
    const request = selectedId
      ? this.plantService.updatePlant(selectedId, payload)
      : this.plantService.createPlant(payload);

    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (savedPlant) => {
        window.alert(`${savedPlant.commonName} was saved successfully.`);
        this.startCreate();
        this.feedback.set(`${savedPlant.commonName} was saved successfully.`);
      },
      error: (error: unknown) => {
        const message = this.getErrorMessage(error, 'Plant could not be saved');
        window.alert(message);
        this.error.set(message);
      }
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

  private buildPlantPayload(): FormData {
    const value = this.plantForm.getRawValue();
    const selectedFiles = this.selectedImageFiles();

    const payload = new FormData();
    payload.append('commonName', value.commonName.trim());
    payload.append('scientificName', value.scientificName.trim());
    payload.append('category', value.category.trim());

    const ayushSystem = value.ayushSystem.trim();
    if (ayushSystem) {
      payload.append('ayushSystem', ayushSystem);
    }

    const modelUrl = value.modelUrl.trim();
    if (modelUrl) {
      payload.append('modelUrl', modelUrl);
    }

    payload.append('shortDescription', value.shortDescription.trim());
    payload.append('description', value.description.trim());
    payload.append('foundIn', value.foundIn.trim());
    payload.append('medicinalUses', value.medicinalUses.trim());

    if (selectedFiles.length === 1) {
      payload.append('imageFile', selectedFiles[0], selectedFiles[0].name);
    } else if (selectedFiles.length > 1) {
      selectedFiles.forEach((file) => payload.append('imageFiles', file, file.name));
    } else if (this.currentImageUrl) {
      payload.append('imageUrl', this.currentImageUrl);
    }

    return payload;
  }

  protected onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);

    this.selectedImageFiles.set(files);
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }

    if (files.length) {
      this.previewObjectUrl = URL.createObjectURL(files[0]);
      this.imagePreviewUrl.set(this.previewObjectUrl);
      return;
    }

    this.imagePreviewUrl.set(this.currentImageUrl ? resolvePlantImageUrl(this.currentImageUrl) : resolvePlantImageUrl(''));
  }

  private setPreviewImage(url: string) {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }

    this.imagePreviewUrl.set(resolvePlantImageUrl(url));
  }

  ngOnDestroy() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (
        error.status === 401 &&
        (detail === 'User not found' || detail === 'Invalid token' || detail === 'Not authenticated')
      ) {
        this.authService.logout();
        this.adminDataLoaded = false;
        this.selectedPlantId.set(null);
        return 'Session expired. Please sign in again.';
      }
      if (typeof detail === 'string') {
        return detail;
      }
    }

    return fallback;
  }

  protected handleImageError(event: Event) {
    applyPlantImageFallback(event);
  }
}

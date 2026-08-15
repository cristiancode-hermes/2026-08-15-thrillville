import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
class PublicOnlyGuardService {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async canActivate(): Promise<boolean> {
    await this.auth.ready;
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}

export const publicOnlyGuard: CanActivateFn = () => inject(PublicOnlyGuardService).canActivate();

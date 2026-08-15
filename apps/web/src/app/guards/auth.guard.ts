import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
class AuthGuardService {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async canActivate(): Promise<boolean> {
    await this.auth.ready;
    if (this.auth.isAuthenticated()) return true;
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return false;
  }
}

export const authGuard: CanActivateFn = () => inject(AuthGuardService).canActivate();

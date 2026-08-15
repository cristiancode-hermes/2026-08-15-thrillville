import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', 'Bearer '.concat(token));
  }
  const router = inject(Router);
  return next(req.clone({ headers })).pipe(
    catchError((err) => {
      if (err && err.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};

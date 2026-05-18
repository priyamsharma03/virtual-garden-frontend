import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'virtual_garden_token';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  let token: string | null = null;

  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }

  if (!token || request.url.includes('/auth/login')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};

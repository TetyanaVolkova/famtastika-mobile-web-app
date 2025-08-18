import { HttpInterceptorFn } from '@angular/common/http';
import { fetchAuthSession } from 'aws-amplify/auth';
import { from, switchMap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  return from(fetchAuthSession()).pipe(
    switchMap((session) => {
      const token = session.tokens?.accessToken?.toString(); // or idToken
      const authReq = token
        ? req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
          })
        : req;
      return next(authReq);
    })
  );
};

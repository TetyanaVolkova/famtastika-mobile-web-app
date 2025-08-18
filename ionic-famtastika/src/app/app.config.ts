import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideIonicAngular } from '@ionic/angular/standalone';

// Amplify UI (brought in via providers in a standalone app)
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIonicAngular(),
    importProvidersFrom(AmplifyAuthenticatorModule),
  ],
};

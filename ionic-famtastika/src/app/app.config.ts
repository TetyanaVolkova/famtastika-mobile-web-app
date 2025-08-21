import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

// Amplify UI (brought in via providers in a standalone app)
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_du37BsRvg',
      userPoolClientId: '5h45cos1ee9p4rr5agkfri3o7d',
      // identityPoolId: 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // optional if you use Federated Identities
      loginWith: {
        // username/email/phone options if you want classic sign-in:
        // username: true,  // or email: true, phone: true
        oauth: {
          domain: 'us-east-1du37bsrvg.auth.us-east-1.amazoncognito.com',
          redirectSignIn: ['myapp://auth-callback', 'http://localhost:4200/'],
          redirectSignOut: ['myapp://signout', 'http://localhost:4200/'],
          responseType: 'code',
          scopes: ['email', 'openid', 'profile'],
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules)
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    importProvidersFrom(AmplifyAuthenticatorModule),
  ],
};

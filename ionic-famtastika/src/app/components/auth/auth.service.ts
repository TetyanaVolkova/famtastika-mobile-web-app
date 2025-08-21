import { Injectable, NgZone } from '@angular/core';
import { Observable, BehaviorSubject, from, of, combineLatest } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  switchMap,
  finalize,
  distinctUntilChanged,
} from 'rxjs/operators';
import { Hub } from 'aws-amplify/utils';
import {
  AuthUser,
  getCurrentUser,
  signOut,
  fetchAuthSession,
  AuthTokens,
} from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Trigger to re-fetch session/tokens (call after login redirect is handled, or after signOut). */
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor(private zone: NgZone) {
    // Refresh on Amplify auth state changes so tokens$ (and fullName$) emit new values
    Hub.listen('auth', ({ payload }) => {
      const evt = payload?.event;
      if (evt === 'signedIn' || evt === 'tokenRefresh' || evt === 'signedOut') {
        this.zone.run(() => this.refreshSession());
      }
    });
  }

  /** Cached tokens. Emits `undefined` when there’s no valid session. */
  readonly tokens$: Observable<AuthTokens | undefined> = this.refresh$.pipe(
    switchMap(() =>
      from(fetchAuthSession()).pipe(
        map((s) => s.tokens),
        catchError(() => of(undefined))
      )
    ),
    // use config form to avoid accidental memory leaks with multiple subscribers
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /** Convenience: emits true when an ID token exists (i.e., user is authenticated). */
  readonly isAuthenticated$: Observable<boolean> = this.tokens$.pipe(
    map((tokens) => !!tokens?.idToken)
  );

  /** Full name from ID token's `name` claim (if present). */
  readonly fullName$: Observable<string | undefined> = this.tokens$.pipe(
    map((tokens) => tokens?.idToken?.payload?.['name']?.toString()),
    distinctUntilChanged()
  );

  /** TRUE if user is in Cognito group "subscribedUsers". */
  readonly isSubscribedByGroup$: Observable<boolean> = this.tokens$.pipe(
    map((tokens) => {
      const raw = tokens?.idToken?.payload?.['cognito:groups'];
      const groups = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
        ? [raw]
        : [];
      console.log('Cognito groups:', groups);
      return groups.includes('HasActiveSubscription');
    }),
    distinctUntilChanged()
  );

  /** TRUE if custom attribute custom:subscribed === 'true'. */
  readonly isSubscribedByAttr$: Observable<boolean> = this.tokens$.pipe(
    map(
      (tokens) =>
        String(tokens?.idToken?.payload?.['custom:subscribed']) === 'true'
    ),
    distinctUntilChanged()
  );

  /** Final flag: subscribed if group OR custom attribute says so. */
  readonly isSubscribed$: Observable<boolean> = combineLatest([
    this.isSubscribedByGroup$,
    this.isSubscribedByAttr$,
  ]).pipe(
    map(([byGroup, byAttr]) => byGroup || byAttr),
    distinctUntilChanged()
  );

  /** One-shot: fetch the current Cognito user (throws if not signed in). */
  getCurrentUser$(): Observable<AuthUser> {
    return from(getCurrentUser());
  }

  /** One-shot: current session tokens (same as tokens$, but as a method). */
  getCurrentSession$(): Observable<AuthTokens | undefined> {
    return this.tokens$;
  }

  /** current user's full name from tokens (same as fullName$, but as a method). */
  getCurrentUserFullName$(): Observable<string | undefined> {
    return this.fullName$;
  }

  /** Manually force a re-fetch of the session/tokens (e.g., after handleSignIn(url)). */
  refreshSession(): void {
    this.refresh$.next();
  }

  /** Observable wrapper for signOut, then refresh regardless of success/failure. */
  signOut$(): Observable<void> {
    return from(signOut()).pipe(finalize(() => this.refreshSession()));
  }
}

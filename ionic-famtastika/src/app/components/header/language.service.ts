import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private selectedLanguage$ = new BehaviorSubject<string>('en');

  setLanguage(lang: string) {
    this.selectedLanguage$.next(lang);
  }

  getLanguage(): Observable<string> {
    return this.selectedLanguage$.asObservable();
  }

  getCurrentLang(): string {
    console.log(this.selectedLanguage$.value);
    return this.selectedLanguage$.value;
  }
}

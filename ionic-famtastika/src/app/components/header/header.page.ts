import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonIcon,
} from '@ionic/angular/standalone';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.page.html',
  styleUrls: ['./header.page.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButtons,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonSelect,
    IonSelectOption,
    MatIconModule,
  ],
})
export class HeaderPage {
  languages = [
    { code: 'en', label: 'EN', lang: 'English' },
    { code: 'ru', label: 'RU', lang: 'Русский' },
    { code: 'es', label: 'ES', lang: 'Español' },
  ];
  selectedLanguage: 'en' | 'ru' | 'es' = 'en';
  constructor(private languageService: LanguageService) {
    this.languageService.getCurrentLang();
  }

  switchLanguage(lang: string) {
    this.languageService.setLanguage(lang);
  }
}

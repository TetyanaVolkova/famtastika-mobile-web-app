import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnnouncementHeaderComponent } from './components/announcement-header/announcement-header.component';
import { FooterComponent } from './components/footer/footer.component';
import { MainHeaderComponent } from './components/main-header/main-header.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    AnnouncementHeaderComponent,
    AnnouncementHeaderComponent,
    FooterComponent,
    MainHeaderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'famtastika-angular';
}

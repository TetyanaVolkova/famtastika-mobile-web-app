import { Component, OnInit } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonCol,
  IonGrid,
  IonItem,
  IonLabel,
  IonRow,
} from '@ionic/angular/standalone';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss'],
  imports: [
    CommonModule,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonAvatar,
    IonItem,
    IonLabel,
  ],
})
export class SubscriptionComponent implements OnInit {
  subscribedAt = '2025';

  constructor(public authService: AuthService) {}

  ngOnInit() {}

  signOut() {
    this.authService.signOut$().subscribe({
      next: () => {
        console.log('Signed out successfully');
      },
      error: (e) => console.error(e),
    });
  }
}

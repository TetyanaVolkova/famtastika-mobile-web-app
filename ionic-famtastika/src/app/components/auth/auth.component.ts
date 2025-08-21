import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SubscriptionComponent } from '../subscription/subscription.component';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    AmplifyAuthenticatorModule,
    IonContent,
    IonButton,
    SubscriptionComponent,
  ],
})
export class AuthComponent implements OnInit {
  formFields = {
    signUp: {
      name: {
        order: 1,
      },
      email: {
        order: 2,
      },
      phone_number: {
        order: 3,
      },
      password: {
        order: 5,
      },
      confirm_password: {
        order: 6,
      },
    },
  };

  constructor(public authService: AuthService) {}

  ngOnInit() {
    console.log('AuthComponent initialized');
  }

  signOut() {
    this.authService.signOut$().subscribe({
      next: () => {
        console.log('Signed out successfully');
      },
      error: (e) => console.error(e),
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonInput,
  IonHeader,
  IonContent,
  IonCol,
  IonRow,
  IonGrid,
  IonCardContent,
  IonCard,
  IonButton,
  IonToolbar,
  IonTitle,
  IonList,
  IonLabel,
  IonItem,
  LoadingController,
  AlertController,
} from '@ionic/angular/standalone';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
    IonCol,
    IonRow,
    IonGrid,
    IonContent,
    IonButton,
    CommonModule,
    FormsModule,
    IonToolbar,
    IonHeader,
    IonList,
    IonInput,
    IonItem,
  ],
})
export class AuthComponent implements OnInit {
  isLoading = false;
  isLogin = true;

  constructor(
    private router: Router,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {}
  authenticate(email: string, password: string) {
    this.isLoading = true;
    // this.loadingCtrl
    //   .create({ keyboardClose: true, message: 'Logging in...' })
    //   .then((loadingEl) => {
    //     loadingEl.present();
    //     let authObs: Observable<AuthResponseData>;
    //     if (this.isLogin) {
    //       authObs = this.authService.login(email, password);
    //     } else {
    //       authObs = this.authService.signup(email, password);
    //     }
    //     authObs.subscribe(
    //       (resData) => {
    //         console.log(resData);
    //         this.isLoading = false;
    //         loadingEl.dismiss();
    //         this.router.navigateByUrl('/places/tabs/discover');
    //       },
    //       (errRes) => {
    //         loadingEl.dismiss();
    //         const code = errRes.error.error.message;
    //         let message = 'Could not sign you up, please try again.';
    //         if (code === 'EMAIL_EXISTS') {
    //           message = 'This email address exists already!';
    //         } else if (code === 'EMAIL_NOT_FOUND') {
    //           message = 'E-Mail address could not be found.';
    //         } else if (code === 'INVALID_PASSWORD') {
    //           message = 'This password is not correct.';
    //         }
    //         this.showAlert(message);
    //       }
    //     );
    //   });
  }

  onSwitchAuthMode() {
    this.isLogin = !this.isLogin;
  }

  onSubmit(form: NgForm) {
    if (!form.valid) {
      return;
    }
    const email = form.value.email;
    const password = form.value.password;

    this.authenticate(email, password);
    form.reset();
  }

  private showAlert(message: string) {
    this.alertCtrl
      .create({
        header: 'Authentication failed',
        message: message,
        buttons: ['Okay'],
      })
      .then((alertEl) => alertEl.present());
  }
}

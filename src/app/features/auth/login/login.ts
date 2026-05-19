import { Component } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ButtonModule,
    CardModule
  ],
  templateUrl: './login.html'
})
export class LoginComponent {

  constructor(
    private authService: AuthService
  ) {}

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }
}
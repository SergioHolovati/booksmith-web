import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ButtonModule,
    CardModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    RouterLink
  ],
  templateUrl: './login.html',
    styleUrl:
    './login.scss'
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }

  async loginWithForm(): Promise<void> {
    const ok = await this.authService.login(
      this.email,
      this.password
    );

    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      alert('Login failed. Please check your credentials.');
    }
  }
}
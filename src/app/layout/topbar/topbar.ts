import { Component } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    AvatarModule,
    ButtonModule
  ],
  templateUrl: './topbar.html'
})
export class TopbarComponent {
  userName = 'Sergio';
}
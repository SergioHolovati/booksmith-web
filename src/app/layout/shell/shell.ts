import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar';
import { TopbarComponent } from '../topbar/topbar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    TopbarComponent
  ],
  templateUrl: './shell.html'
})
export class ShellComponent {}
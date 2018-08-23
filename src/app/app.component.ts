import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthorizationService } from './service/auth.service';
import { AlertService } from './service/http.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  
  isAuthorized(): boolean {
    return this.authorizationService.isAuthorized();
  }

  isLoading(): boolean { 
    return this.alertService.isLoading();
  }

  private navigateToLogin() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authorizationService.logout().
      subscribe(
        () => this.navigateToLogin(),
        (error) => this.navigateToLogin()
      );
  }

  constructor(
    private alertService: AlertService,
    private authorizationService: AuthorizationService,
    private router: Router
  ) { }

}

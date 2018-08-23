import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthorizationService } from '../service/auth.service';
import { HTTPService } from '../service/http.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  username: string = "";
  password: string = "";
  
  rememberToken: boolean = false;

  errorMessage: string;

  constructor(private httpService: HTTPService, 
    private authorizationService: AuthorizationService, 
    private router: Router) { }

  login() {
    this.authorizationService.performAuthorization(this.username, this.password, this.rememberToken)
    .subscribe(
      () => this.onSuccess(),
      (err) => this.errorMessage = err.json().error_description
    );
  }
  
  private onSuccess() {
    this.router.navigate(['/feed']);
    this.errorMessage = undefined;
  }
}

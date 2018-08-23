import { NgModule, Injectable } from '@angular/core';
import { RouterModule, Routes, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthorizationService } from './service/auth.service';

import { LoginComponent } from './login/login.component';
import { FeedComponent } from './feed/feed.component';
import { ConfigurationComponent } from './configuration/configuration.component';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authorizationService: AuthorizationService) { }
  canActivate(destination: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if(this.authorizationService.isAuthorized()){
      if(destination.component === LoginComponent) {
        this.router.navigate(['/feed']);
        return false;
      }
      return true;
    } else {
      if(destination.component === LoginComponent) {
        return true;
      }
      this.router.navigate(['/login']);
      return false;
    }
  }
}

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [AuthGuard] },
  { path: 'feed', component: FeedComponent, canActivate: [AuthGuard] },
  { path: 'configuration', component: ConfigurationComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes)
  ],
  exports: [
    RouterModule
  ],
  providers: [
    AuthGuard
  ]
})
export class AppRoutingModule {}

export function getBaseHref() {
  // Use the same base URL as the HTML page. Admin can change base href, for example when using URL rewrites.
  return document.querySelector('base').href;
}

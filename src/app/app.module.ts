import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { APP_BASE_HREF } from '@angular/common';

import { AppMaterialModule } from './material.module';

import { HTTPService, AlertService } from './service/http.service';
import { AuthorizationService } from './service/auth.service';
import { I18nService } from './service/i18n.service';

import { AppRoutingModule, getBaseHref } from './router.module';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { FeedComponent } from './feed/feed.component';
import { ConfigurationComponent } from './configuration/configuration.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    FeedComponent,
    ConfigurationComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppMaterialModule,
    AppRoutingModule,
    FormsModule,
    HttpModule
  ],
  providers: [
    HTTPService,
    AlertService,
    AuthorizationService,
    I18nService,
    { provide: APP_BASE_HREF, useFactory: getBaseHref },
    { provide: LOCALE_ID, useValue: 'en' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

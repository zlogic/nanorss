import { NgModule } from '@angular/core';

import {
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatInputModule,
  MatCheckboxModule,
  MatToolbarModule,
  MatExpansionModule,
  MatProgressBarModule,
  MatSnackBarModule
} from '@angular/material';

@NgModule({
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  exports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatToolbarModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatSnackBarModule
  ]
})
export class AppMaterialModule { }
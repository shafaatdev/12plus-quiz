import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'app-confirmation-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true">{{ data.confirmLabel }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmationDialog {
  readonly data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);
}
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  ConfirmationDialog,
  ConfirmationDialogData,
} from '../components/confirmation-dialog/confirmation-dialog';

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialog = inject(MatDialog);

  async confirm(data: ConfirmationDialogData): Promise<boolean> {
    const result = await firstValueFrom(
      this.dialog.open(ConfirmationDialog, { data, role: 'alertdialog' }).afterClosed(),
    );
    return result === true;
  }
}
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  imports: [MatIconModule],
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly router = inject(Router);

  navigate(path: 'vocabulary' | 'non-verbal'): void {
    void this.router.navigateByUrl(`/${path}`);
  }
}
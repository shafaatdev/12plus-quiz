import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  imports: [MatIconModule, RouterLink],
  selector: 'app-non-verbal-page',
  templateUrl: './non-verbal-page.html',
})
export class NonVerbalPage {}
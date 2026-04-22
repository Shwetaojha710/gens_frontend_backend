import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing-header',
  imports: [RouterModule],
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.css'
})
export class LandingHeaderComponent {
  constructor(private router: Router) {}

  login(): void {
    void this.router.navigate(['login']);
  }

  goHome(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/Home']).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  goSection(event: Event, fragment: string): void {
    event.preventDefault();
    void this.router.navigate(['/Home'], { fragment, replaceUrl: true }).then(() => {
      const el = document.getElementById(fragment);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      [80, 200, 450].forEach((ms) =>
        setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), ms),
      );
    });
  }
}

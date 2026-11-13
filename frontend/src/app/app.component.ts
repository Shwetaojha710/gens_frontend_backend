import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';
import { MarketingThemeService } from './marketing/services/marketing-theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'forntend';

  constructor(
    private theme: ThemeService,
    /** Keep constructed so landing dark/light syncs to admin shell */
    private colorMode: MarketingThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.theme.loadAndApply();
    // Apply light/dark AFTER brand colors so dark page-bg wins
    this.colorMode.syncFromStorage();

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.theme.applyForUrl((e as NavigationEnd).urlAfterRedirects);
        // Re-assert light/dark after brand vars (ThemeService must not clobber dark shell)
        this.colorMode.syncFromStorage();
      });
  }
}

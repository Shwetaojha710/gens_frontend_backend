import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'forntend';

  constructor(private theme: ThemeService, private router: Router) {}

  ngOnInit(): void {
    this.theme.loadAndApply();

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.theme.applyForUrl((e as NavigationEnd).urlAfterRedirects);
      });
  }
}

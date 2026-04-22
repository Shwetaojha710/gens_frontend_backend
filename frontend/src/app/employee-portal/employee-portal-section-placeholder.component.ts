import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-employee-portal-section-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './employee-portal-section-placeholder.component.html',
  styleUrl: './employee-portal-section-placeholder.component.css',
})
export class EmployeePortalSectionPlaceholderComponent implements OnInit {
  title = '';
  subtitle = '';
  body = '';
  icon = 'ri-file-list-3-line';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const d = this.route.snapshot.data as Record<string, string>;
    this.title = d['epTitle'] ?? 'Page';
    this.subtitle = d['epSubtitle'] ?? '';
    this.body = d['epBody'] ?? '';
    if (d['epIcon']) this.icon = d['epIcon'];
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PermissionService,
  PermissionSection,
  UserRole,
  ALL_ROLES,
  ROLE_LABELS,
} from '../../services/permission.service';

interface AccessSection {
  key: string;
  label: string;
  icon: string;
  allowed: boolean;
  children: { key: string; label: string; allowed: boolean }[];
}

@Component({
  selector: 'app-user-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-access.component.html',
  styleUrls: ['./user-access.component.css'],
})
export class UserAccessComponent implements OnInit {
  /** The role being previewed */
  previewRole: UserRole = 'hr';

  /** Logged-in user info */
  loggedInRole: UserRole = 'hr';
  loggedInName = '';

  allRoles = ALL_ROLES;
  roleLabels = ROLE_LABELS;

  sections: AccessSection[] = [];
  expandedSections = new Set<string>();

  /** Counts */
  get allowedCount(): number {
    return this.sections.filter(s => s.allowed).length +
      this.sections.flatMap(s => s.children).filter(c => c.allowed).length;
  }
  get totalCount(): number {
    return this.sections.length +
      this.sections.flatMap(s => s.children).length;
  }

  constructor(private permSvc: PermissionService) {}

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.loggedInRole = (user?.role as UserRole) || 'hr';
      this.loggedInName = user?.name || user?.username || user?.email || '';
    } catch {
      this.loggedInRole = 'hr';
    }

    // Default: preview own role
    this.previewRole = this.loggedInRole;
    this.buildAccessTree();
  }

  onRoleChange(): void {
    this.buildAccessTree();
  }

  private buildAccessTree(): void {
    const all: PermissionSection[] = this.permSvc.load();
    this.sections = all.map(s => {
      const parentAllowed = s.roles.includes(this.previewRole);
      return {
        key: s.key,
        label: s.label,
        icon: s.icon,
        allowed: parentAllowed,
        children: (s.children || []).map(c => ({
          key: c.key,
          label: c.label,
          allowed: parentAllowed && c.roles.includes(this.previewRole),
        })),
      };
    });

    // Expand all sections that have at least one allowed child
    this.expandedSections.clear();
    this.sections.forEach(s => {
      if (s.allowed) this.expandedSections.add(s.key);
    });
  }

  toggleExpand(key: string): void {
    this.expandedSections.has(key)
      ? this.expandedSections.delete(key)
      : this.expandedSections.add(key);
  }

  isExpanded(key: string): boolean {
    return this.expandedSections.has(key);
  }

  isOwnRole(): boolean {
    return this.previewRole === this.loggedInRole;
  }

  isAdmin(): boolean {
    return this.loggedInRole === 'admin' || this.loggedInRole === 'superadmin';
  }

  countAllowed(children: { allowed: boolean }[]): number {
    return children.filter(c => c.allowed).length;
  }

  roleColor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      admin:      '#6366f1',
      superadmin: '#8b5cf6',
      hr:         '#0ea5e9',
      manager:    '#f59e0b',
      director:   '#10b981',
      recruiter:  '#f97316',
      employee:   '#64748b',
    };
    return map[role] || '#64748b';
  }
}

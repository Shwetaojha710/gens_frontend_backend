import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  PermissionService,
  PermissionSection,
  UserRole,
  ALL_ROLES,
  ROLE_LABELS,
  DEFAULT_PERMISSIONS,
} from '../../services/permission.service';
import { Notyf } from 'notyf';

@Component({
  selector: 'app-role-permission',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './role-permission.component.html',
  styleUrls: ['./role-permission.component.css'],
})
export class RolePermissionComponent implements OnInit {
  sections: PermissionSection[] = [];
  allRoles = ALL_ROLES;
  roleLabels = ROLE_LABELS;
  expandedSections = new Set<string>();
  private notyf = new Notyf();

  constructor(private permSvc: PermissionService) {}

  ngOnInit(): void {
    this.sections = this.permSvc.load();
    // Expand all by default
    this.sections.forEach(s => this.expandedSections.add(s.key));
  }

  toggleExpand(key: string): void {
    this.expandedSections.has(key)
      ? this.expandedSections.delete(key)
      : this.expandedSections.add(key);
  }

  isExpanded(key: string): boolean {
    return this.expandedSections.has(key);
  }

  hasRole(roles: UserRole[], role: UserRole): boolean {
    return roles.includes(role);
  }

  toggleRole(roles: UserRole[], role: UserRole): void {
    const idx = roles.indexOf(role);
    if (idx >= 0) {
      roles.splice(idx, 1);
    } else {
      roles.push(role);
    }
  }

  /** Toggle a role on a parent section — syncs ALL children both ways */
  toggleParentRole(section: PermissionSection, role: UserRole): void {
    this.toggleRole(section.roles, role);
    const hasIt = section.roles.includes(role);
    if (section.children) {
      section.children.forEach(child => {
        const i = child.roles.indexOf(role);
        if (hasIt) {
          // Parent turned ON → add role to every child that doesn't have it
          if (i < 0) child.roles.push(role);
        } else {
          // Parent turned OFF → remove role from every child that has it
          if (i >= 0) child.roles.splice(i, 1);
        }
      });
    }
  }

  save(): void {
    this.permSvc.save(this.sections);
    this.notyf.success('Permissions saved successfully!');
  }

  reset(): void {
    if (!confirm('Reset all permissions to default?')) return;
    this.sections = this.permSvc.reset();
    this.sections.forEach(s => this.expandedSections.add(s.key));
    this.notyf.success('Permissions reset to default.');
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

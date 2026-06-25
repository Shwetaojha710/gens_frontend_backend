import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import {
  PermissionService,
  PermissionSection,
  UserRole,
  ALL_ROLES,
  ROLE_LABELS,
} from '../../services/permission.service';
import { UserPermissionService, TenantUser } from './user-permission.service';

@Component({
  selector: 'app-user-permission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-permission.component.html',
  styleUrls: ['./user-permission.component.css'],
})
export class UserPermissionComponent implements OnInit {

  // ── User list ──────────────────────────────────────────────────────────────
  users: TenantUser[] = [];
  filteredUsers: TenantUser[] = [];
  searchQuery = '';
  loadingUsers = true;

  // ── Selected user + permission panel ──────────────────────────────────────
  selectedUser: TenantUser | null = null;
  sections: PermissionSection[] = [];
  expandedSections = new Set<string>();
  panelLoading = false;
  hasCustomPerms = false;
  allRoles = ALL_ROLES;
  roleLabels = ROLE_LABELS;

  private notyf = new Notyf();

  constructor(
    private permSvc: PermissionService,
    private userPermSvc: UserPermissionService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // ── Load all tenant users ─────────────────────────────────────────────────
  loadUsers(): void {
    this.loadingUsers = true;
    this.userPermSvc.getTenantUsers().subscribe({
      next: (res: any) => {
        this.users = res?.data || [];
        this.filteredUsers = [...this.users];
        this.loadingUsers = false;
      },
      error: () => {
        this.notyf.error('Failed to load users');
        this.loadingUsers = false;
      }
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredUsers = q
      ? this.users.filter(u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        )
      : [...this.users];
  }

  // ── Select a user → load their permissions ────────────────────────────────
  selectUser(user: TenantUser): void {
    this.selectedUser = user;
    this.panelLoading = true;
    this.sections = [];
    this.expandedSections.clear();

    this.userPermSvc.getUserPermission(user.id).subscribe({
      next: (res: any) => {
        const custom: PermissionSection[] | null = res?.data || null;
        if (custom && custom.length > 0) {
          // Merge DB-saved custom perms with latest DEFAULT_PERMISSIONS
          // so any newly added menu items appear even in old saved data
          this.sections = this.permSvc.mergeWithDefaults(custom);
          this.hasCustomPerms = true;
        } else {
          this.sections = JSON.parse(JSON.stringify(this.permSvc.load()));
          this.hasCustomPerms = false;
        }
        this.sections.forEach(s => this.expandedSections.add(s.key));
        this.panelLoading = false;
      },
      error: () => {
        this.sections = JSON.parse(JSON.stringify(this.permSvc.load()));
        this.hasCustomPerms = false;
        this.sections.forEach(s => this.expandedSections.add(s.key));
        this.panelLoading = false;
      }
    });
  }

  // ── Permission toggles ────────────────────────────────────────────────────
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
    if (idx >= 0) roles.splice(idx, 1);
    else roles.push(role);
  }

  toggleParentRole(section: PermissionSection, role: UserRole): void {
    this.toggleRole(section.roles, role);
    const hasIt = section.roles.includes(role);
    if (section.children) {
      section.children.forEach(child => {
        const i = child.roles.indexOf(role);
        if (hasIt) {
          // Parent turned ON → add role to every child
          if (i < 0) child.roles.push(role);
        } else {
          // Parent turned OFF → remove role from every child
          if (i >= 0) child.roles.splice(i, 1);
        }
      });
    }
  }

  // ── Save / Reset ──────────────────────────────────────────────────────────
  save(): void {
    if (!this.selectedUser) return;
    this.userPermSvc.saveUserPermission(this.selectedUser.id, this.sections).subscribe({
      next: () => {
        this.hasCustomPerms = true;
        this.notyf.success(`Permissions saved for ${this.selectedUser!.name}`);
      },
      error: () => this.notyf.error('Failed to save permissions')
    });
  }

  resetToDefault(): void {
    if (!this.selectedUser) return;
    if (!confirm(`Reset ${this.selectedUser.name}'s permissions to role defaults?`)) return;
    this.userPermSvc.deleteUserPermission(this.selectedUser.id).subscribe({
      next: () => {
        this.sections = JSON.parse(JSON.stringify(this.permSvc.load()));
        this.hasCustomPerms = false;
        this.notyf.success(`Reset to role defaults for ${this.selectedUser!.name}`);
      },
      error: () => this.notyf.error('Failed to reset permissions')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  roleColor(role: string): string {
    const map: Record<string, string> = {
      admin: '#6366f1', superadmin: '#8b5cf6',
      hr: '#0ea5e9', manager: '#f59e0b',
      director: '#10b981', recruiter: '#f97316',
      employee: '#64748b',
    };
    return map[role] || '#64748b';
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      admin: 'bg-label-primary', superadmin: 'bg-label-info',
      hr: 'bg-label-success', manager: 'bg-label-warning',
      director: 'bg-label-secondary', recruiter: 'bg-label-danger',
      employee: 'bg-label-secondary',
    };
    return map[role] || 'bg-label-secondary';
  }
}

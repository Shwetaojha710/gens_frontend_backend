// menu.model.ts

export type UserRole =
  | 'admin'
  | 'superadmin'
  | 'hr'
  | 'manager'
  | 'director'
  | 'recruiter'
  | 'employee';

export interface MenuItem {
  [x: string]: any;
  title: string;
  icon: string;
  link?: any;
  active?: boolean;
  open?: boolean;
  target?: string;
  children?: MenuItem[];
  routeLink?: any[];
  /** Roles that can see this item. Omit (undefined) = visible to all roles. */
  roles?: UserRole[];
  /** PermissionService key — when set, visibility is controlled by the Role Permission page. */
  permKey?: string;
  /** Optional query params passed to [queryParams] on the routerLink. */
  queryParams?: { [key: string]: string };
  /** Set to true when children are loaded lazily (prevents empty-children filter). */
  lazyChildren?: boolean;
}

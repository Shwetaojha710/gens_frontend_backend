// menu.model.ts
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
}

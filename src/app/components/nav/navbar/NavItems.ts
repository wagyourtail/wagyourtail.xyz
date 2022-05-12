export interface NavItem {
  title: string;
  description: string;
  url: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

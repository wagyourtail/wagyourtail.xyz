export interface NavItem {
  title: string;
  description: string;
  url: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NavItems: NavSection[] = [
  {
    title: 'Welcome',
    items: [
      {
        title: "About Me",
        description: "WhoAmI",
        url: "AboutMe"
      },
      {
        title: "Contact",
        description: "Email, Discord, LinkedIn, etc.",
        url: "Contact"
      }
    ]
  },
  {
    title: 'Projects',
    items: [
      {
        title: "JS Macros",
        description: "Mod for automation and prototyping in minecraft.",
        url: "JSMacros"
      },
      {
        title: "Minecraft Mapping Viewer",
        description: "A web app for viewing the various Minecraft obfuscation mappings.",
        url: "MinecraftMappingViewer"
      }
    ]
  }
]

export const BottomItems: NavItem[] = [
  {
    title: "Github",
    description: "",
    url: "https://github.com/wagyourtail"
  }
]

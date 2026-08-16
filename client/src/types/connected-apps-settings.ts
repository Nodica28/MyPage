export interface ConnectedApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  learnMoreUrl?: string;
}

export interface ConnectedAppsSettings {
  apps: ConnectedApp[];
}

// Default connected apps based on the image
export const defaultConnectedApps: ConnectedApp[] = [
  {
    id: "linear",
    name: "Linear",
    description:
      "Streamline software projects, sprints, tasks, and bug tracking.",
    icon: "/icons/linear.svg",
    isEnabled: false
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link pull requests and automate workflows.",
    icon: "/icons/github.svg",
    isEnabled: false
  },
  {
    id: "figma",
    name: "Figma",
    description: "Embed file previews in projects.",
    icon: "/icons/figma.svg",
    isEnabled: false
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Build custom automations and integrations with other apps.",
    icon: "/icons/zapier.svg",
    isEnabled: false
  },
  {
    id: "notion",
    name: "Notion",
    description: "Embed notion pages and notes in projects.",
    icon: "/icons/notion.svg",
    isEnabled: false
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Send notifications to channels and create projects from messages.",
    icon: "/icons/slack.svg",
    isEnabled: false
  }
];

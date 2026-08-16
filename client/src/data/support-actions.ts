import {
  Book,
  Video,
  MessageSquare,
  CreditCard
} from "lucide-react";

export const quickActions = [
  {
    title: "Getting Started Guide",
    description: "Complete setup guide for new users",
    icon: Book,
    action: "View Guide",
    category: "tutorial"
  },
  {
    title: "Video Tutorials",
    description: "Step-by-step video walkthroughs",
    icon: Video,
    action: "Watch Videos",
    category: "tutorial"
  },
  {
    title: "Contact Support",
    description: "Send us a message for personalized help",
    icon: MessageSquare,
    action: "Send Message",
    category: "contact"
  },
  {
    title: "Account & Billing",
    description: "Manage your subscription and payments",
    icon: CreditCard,
    action: "View Billing",
    category: "billing"
  }
];
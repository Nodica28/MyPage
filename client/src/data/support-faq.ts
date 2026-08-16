import {
  BadgeCheck,
  SquareUser,
  Layers,
  UserRoundPlus,
  QrCode,
  Building2,
  Bot,
  CreditCard,
  Settings
} from "lucide-react";

export const faqItems = [
  {
    category: "Badge Profile",
    icon: BadgeCheck,
    questions: [
      {
        question: "How do I create my badge profile?",
        answer:
          "Navigate to 'My Page' in the sidebar and click 'Edit Profile'. Fill in your personal information, upload a profile image, and customize your bio. You can also add sections for different types of content."
      },
      {
        question: "How do I make my profile public?",
        answer:
          "In your profile settings, toggle the 'Public Profile' option. You can customize your public URL and choose which information to display publicly."
      },
      {
        question: "Can I customize my profile URL?",
        answer:
          "Yes! Go to Settings > Profile and set your custom public path. This will create a personalized URL like badge.com/yourname."
      },
      {
        question: "How do I add sections to my profile?",
        answer:
          "Click the '+' button or 'Add Section' in your profile editor. Choose from various section types like content, calendar, CTA buttons, and more."
      }
    ]
  },
  {
    category: "AI Headshots",
    icon: SquareUser,
    questions: [
      {
        question: "How do AI headshots work?",
        answer:
          "Upload 10-20 high-quality photos of yourself, and our AI will generate professional headshots in various styles. The process typically takes 10-15 minutes."
      },
      {
        question: "What photos should I upload for best results?",
        answer:
          "Use clear, well-lit photos showing your face from different angles. Avoid sunglasses, heavy filters, or group photos. Higher quality input photos produce better results."
      },
      {
        question: "How long does it take to generate headshots?",
        answer:
          "AI headshot generation typically takes 10-15 minutes. You'll receive an email notification when your headshots are ready."
      },
      {
        question: "Can I regenerate headshots with different styles?",
        answer:
          "Yes! You can create multiple headshot sessions with different styles and settings using the same uploaded photos."
      }
    ]
  },
  {
    category: "Brand Assets",
    icon: Layers,
    questions: [
      {
        question: "What types of brand assets can I create?",
        answer:
          "You can create email signatures, banner images, zoom backgrounds, business cards, and other branded materials using our design tools."
      },
      {
        question: "How do I create an email signature?",
        answer:
          "Go to Brand Assets > Email Signature, customize your design with your information and branding, then download the HTML or image file to use in your email client."
      },
      {
        question: "Can I use my company branding?",
        answer:
          "Yes! Upload your company logo and set brand colors in your organization settings. These will be available across all design tools."
      },
      {
        question: "What formats can I download assets in?",
        answer:
          "Most assets can be downloaded in PNG, JPG, SVG, or HTML formats depending on the asset type and intended use."
      }
    ]
  },
  {
    category: "Leads & Analytics",
    icon: UserRoundPlus,
    questions: [
      {
        question: "How do I track profile visitors?",
        answer:
          "Lead tracking is automatically enabled for public profiles. View your leads in the 'Leads' section to see who visited your profile and their contact information."
      },
      {
        question: "What information do I get about leads?",
        answer:
          "You'll see visitor names, email addresses, companies, and which parts of your profile they viewed. Some information depends on how visitors interact with your profile."
      },
      {
        question: "How do I export my leads?",
        answer:
          "In the Leads section, select the leads you want to export and click 'Export'. You can download them as CSV for use in other tools."
      },
      {
        question: "Can I add notes or tags to leads?",
        answer:
          "Yes! Click on any lead to add notes, tags, and track your follow-up activities. This helps you manage your lead pipeline effectively."
      }
    ]
  },
  {
    category: "QR Codes",
    icon: QrCode,
    questions: [
      {
        question: "How do I create a QR code for my profile?",
        answer:
          "In your badge profile, click the QR code button in the top toolbar. You can customize the design, colors, and add your logo before downloading."
      },
      {
        question: "Can I customize my QR code design?",
        answer:
          "Yes! You can change colors, add your company logo, and choose from different styles to match your branding."
      },
      {
        question: "What formats can I download QR codes in?",
        answer:
          "QR codes can be downloaded in PNG, SVG, or PDF formats in various sizes suitable for business cards, flyers, or digital use."
      }
    ]
  },
  {
    category: "Team & Organizations",
    icon: Building2,
    questions: [
      {
        question: "How do I invite team members?",
        answer:
          "Company admins can invite team members by clicking 'Invite Team' in the sidebar or going to Settings > Team. Enter email addresses to send invitations."
      },
      {
        question: "What are the different user roles?",
        answer:
          "There are regular users and company admins. Admins can manage company settings, branding, invite users, and access billing information."
      },
      {
        question: "How do I set up company branding?",
        answer:
          "Go to Settings > Company Profile to upload your company logo, set brand colors, and configure default settings for all team members."
      },
      {
        question: "Can I control what team members can access?",
        answer:
          "Company admins can set organization-wide settings and branding defaults. Individual users control their own profile content and privacy settings."
      }
    ]
  },
  {
    category: "AI Chat Assistant",
    icon: Bot,
    questions: [
      {
        question: "How does the AI chat assistant work?",
        answer:
          "The AI chat assistant can answer questions about your profile and services. Visitors to your profile can chat with it to get information when you're not available."
      },
      {
        question: "How do I set up the chat assistant?",
        answer:
          "Go to your profile settings and enable the AI Chat feature. You can customize the assistant's knowledge base and response style."
      },
      {
        question: "Can I train the AI with my own content?",
        answer:
          "Yes! You can provide documents, FAQs, and other content to train the AI assistant to better represent your business and answer specific questions."
      }
    ]
  },
  {
    category: "Account & Billing",
    icon: CreditCard,
    questions: [
      {
        question: "What's included in the free plan?",
        answer:
          "The free plan includes basic profile creation, limited AI headshots, and essential features. Upgrade to Pro for unlimited features and advanced customization."
      },
      {
        question: "How do I upgrade my account?",
        answer:
          "Click the 'Upgrade to Pro' button in your profile dropdown or go to Settings > Billing to choose a plan and enter payment information."
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer:
          "Yes, you can cancel your subscription at any time from Settings > Billing. Your Pro features will remain active until the end of your billing period."
      },
      {
        question: "Do you offer refunds?",
        answer:
          "We offer a 30-day money-back guarantee for annual subscriptions. Contact support for refund requests within the guarantee period."
      }
    ]
  },
  {
    category: "Technical Issues",
    icon: Settings,
    questions: [
      {
        question: "Why isn't my profile image uploading?",
        answer:
          "Ensure your image is under 10MB and in JPG, PNG, or WebP format. Check your internet connection and try refreshing the page. Clear your browser cache if issues persist."
      },
      {
        question: "My QR code isn't working properly",
        answer:
          "Test your QR code with multiple scanner apps. Ensure the URL is correct and your profile is set to public. Very small QR codes may be harder to scan."
      },
      {
        question: "I'm not receiving email notifications",
        answer:
          "Check your spam folder and ensure notifications are enabled in Settings > Notifications. Add our email domain to your safe senders list."
      },
      {
        question: "The app is running slowly",
        answer:
          "Clear your browser cache and cookies. Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge). Disable browser extensions that might interfere."
      }
    ]
  }
];
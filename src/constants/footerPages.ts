import type { FooterPageContent, FooterPageKey } from "../types";

export const footerPages: Record<FooterPageKey, FooterPageContent> = {
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro:
      "These terms explain how Go by 17Bytes may be used, what users are responsible for, and how paid access works.",
    sections: [
      {
        heading: "Service use",
        body:
          "Go by 17Bytes helps users create, manage, and measure short links. You are responsible for the links you create, the destinations you share, and any activity connected to your account.",
      },
      {
        heading: "Account and access",
        body:
          "Keep your login secure. We may restrict, suspend, or remove links or accounts that create risk, abuse the platform, or violate these terms.",
      },
      {
        heading: "Paid plans",
        body:
          "Paid plans provide premium access for the selected duration, including unlimited premium links under fair use, complete analytics history, advanced expiry controls, priority support, and future premium upgrades.",
      },
      {
        heading: "Fair use",
        body:
          "Unlimited usage is subject to fair-use protections. Automated spam, abusive bulk creation, resale, scraping, or activity that affects platform stability is not permitted.",
      },
      {
        heading: "Limitation",
        body:
          "The service is provided with reasonable care, but availability may vary due to maintenance, third-party providers, infrastructure issues, or misuse prevention.",
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    intro:
      "This policy explains the information Go by 17Bytes uses to operate accounts, short links, analytics, billing, and support.",
    sections: [
      {
        heading: "Information we process",
        body:
          "We may process your email, account identity, created links, link metadata, QR usage, click timestamps, referrers, device type, browser details, IP-derived visitor signals, support messages, and payment metadata.",
      },
      {
        heading: "How it is used",
        body:
          "Data is used to provide the service, secure accounts, record analytics, prevent abuse, process payments, improve reliability, and respond to support or legal requests.",
      },
      {
        heading: "Payments",
        body:
          "Payments are processed by Razorpay. Go by 17Bytes does not store card, UPI, or banking credentials on its own servers.",
      },
      {
        heading: "Your choices",
        body:
          "You may request correction, deletion, account removal, or privacy assistance by contacting the support or privacy contact listed on this site.",
      },
    ],
  },
  refunds: {
    eyebrow: "Payments",
    title: "Refund & Cancellation Policy",
    intro:
      "Go by 17Bytes sells one-time access plans. There are no recurring monthly subscriptions to cancel.",
    sections: [
      {
        heading: "One-time plans",
        body:
          "Plans are purchased for the selected access period. Lifetime access means access for the lifetime of the Go by 17Bytes product, subject to the terms and fair-use policy.",
      },
      {
        heading: "Refund requests",
        body:
          "Refunds may be reviewed when payment was accidental, duplicate, or the service could not be activated. Heavy usage, abuse, or completed value delivery may make a plan ineligible for refund.",
      },
      {
        heading: "How to request help",
        body:
          "Contact support with your account email, payment reference, plan selected, and reason for the request. We will review the request and respond as soon as reasonably possible.",
      },
    ],
  },
  acceptableUse: {
    eyebrow: "Trust",
    title: "Acceptable Use Policy",
    intro:
      "Short links must be safe, lawful, and respectful of users, platforms, and third-party rights.",
    sections: [
      {
        heading: "Not allowed",
        body:
          "Do not use Go for phishing, malware, credential theft, spam, scams, impersonation, illegal content, payment fraud, deceptive redirects, harassment, exploitation, or content that violates applicable law.",
      },
      {
        heading: "Enforcement",
        body:
          "We may disable links, limit accounts, remove content, or terminate access when links create security, legal, platform, or user-safety risk.",
      },
      {
        heading: "Responsible sharing",
        body:
          "Make sure your destination pages are accurate, safe, and permitted by the services where you share them.",
      },
    ],
  },
  abuse: {
    eyebrow: "Safety",
    title: "Report Abuse",
    intro:
      "If a Go short link is being used for phishing, malware, spam, scams, impersonation, or harmful activity, report it for review.",
    sections: [
      {
        heading: "What to include",
        body:
          "Send the short link, the destination if known, the reason for the report, screenshots if available, and any relevant context that helps us investigate quickly.",
      },
      {
        heading: "Abuse contact",
        body:
          "Email abuse@17bytes.com for abuse reports. Serious security or phishing reports should include as much evidence as possible.",
      },
      {
        heading: "Review process",
        body:
          "Reported links may be reviewed and disabled when they violate our policies or create risk for users or third parties.",
      },
    ],
  },
  contact: {
    eyebrow: "Support",
    title: "Contact & Support",
    intro:
      "For product help, billing questions, account issues, privacy requests, or business enquiries, contact the Go by 17Bytes team.",
    sections: [
      {
        heading: "Support",
        body:
          "Email support@17bytes.com for product support, billing assistance, account help, and general questions.",
      },
      {
        heading: "Privacy and data requests",
        body:
          "For privacy, correction, deletion, or account-data requests, contact privacy@17bytes.com with your account email and request details.",
      },
      {
        heading: "Business enquiries",
        body:
          "For partnerships, company enquiries, or product-related business communication, contact the 17Bytes team through the main company website.",
      },
    ],
  },
  about: {
    eyebrow: "Company",
    title: "About Go by 17Bytes",
    intro:
      "Go by 17Bytes is a professional link management product built for simple, secure, and measurable sharing.",
    sections: [
      {
        heading: "About us",
        body:
          "Go by 17Bytes helps individuals, creators, teams, and businesses create short links, manage campaigns, generate QR codes, and understand link performance from one clean dashboard.",
      },
      {
        heading: "Product",
        body:
          "Go is designed to keep link sharing fast, clear, and reliable, with temporary links, custom aliases, analytics, QR codes, and premium access options.",
      },
      {
        heading: "Company",
        body:
          "Go by 17Bytes is operated by 17Bytes. Visit 17bytes.com to learn more about the main company.",
      },
    ],
  },
  go: {
    eyebrow: "Product",
    title: "Go by 17Bytes",
    intro:
      "Go is the link management product by 17Bytes, built for fast sharing, clean dashboards, QR codes, and measurable campaign links.",
    sections: [
      {
        heading: "What Go does",
        body:
          "Go helps you shorten long URLs, create custom aliases, generate QR codes, manage link status, and track link performance from one focused workspace.",
      },
      {
        heading: "Free access",
        body:
          "Free users can create temporary links, manage up to 10 permanent links, generate QR codes, and view basic analytics for recent clicks.",
      },
      {
        heading: "Premium access",
        body:
          "Premium plans unlock unlimited premium links under fair use, complete analytics history, advanced expiry controls, priority support, and future premium upgrades.",
      },
    ],
  },
};

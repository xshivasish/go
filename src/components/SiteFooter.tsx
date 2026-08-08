import logo from "../assets/0.png";
import razorpayLogo from "../assets/razorpay.svg";
import paypalLogo from "../assets/paypal.svg";

const poweredByLogos = [
  { name: "Razorpay", src: razorpayLogo },
  { name: "PayPal", src: paypalLogo },
];

function LinkedinMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452z" />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RedditMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.198 24 1.986 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm5.943 12.416c.058.278.087.564.087.857 0 3.24-3.548 5.865-7.926 5.865-4.379 0-7.926-2.626-7.926-5.865 0-.293.03-.579.086-.857-.517-.294-.865-.858-.865-1.5 0-.966.784-1.75 1.75-1.75.502 0 .954.213 1.271.552 1.208-.87 2.905-1.424 4.784-1.49l.878-4.113 2.888.583c.144-.55.641-.958 1.232-.958.702 0 1.271.569 1.271 1.271s-.569 1.271-1.271 1.271c-.634 0-1.157-.464-1.253-1.07l-2.588-.531-.75 3.522c1.821.075 3.462.626 4.643 1.494.319-.336.767-.545 1.264-.545.966 0 1.75.784 1.75 1.75 0 .639-.343 1.196-.855 1.492ZM8.25 12.5c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25Zm7.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25Zm-6.03 3.29c-.15.1-.19.3-.09.45.75 1.08 2.11 1.18 2.37 1.18s1.62-.1 2.37-1.18c.1-.15.06-.35-.09-.45-.15-.1-.35-.06-.45.09-.55.79-1.53.9-1.83.9s-1.28-.11-1.83-.9c-.1-.15-.3-.19-.45-.09Z" />
    </svg>
  );
}

const socialLinks = [
  { name: "LinkedIn", href: "https://www.linkedin.com/company/17bytes", icon: LinkedinMark },
  { name: "X", href: "https://x.com/17bytes", icon: XMark },
  { name: "Reddit", href: "https://www.reddit.com/r/17Bytes/", icon: RedditMark },
];

export function SiteFooter() {
  return (
    <footer className="specialFooter">
      <div className="footerTop">
        <div className="footerMain">
          <a className="footerLogo" href="/">
            <img src={logo} alt="Go" />
            <span>Go by 17Bytes</span>
          </a>
          <p>
            Shorten, manage, and share links with custom aliases, QR codes, temporary expiry,
            analytics, and dashboard controls.
          </p>

          <div className="footerSocialLinks">
            {socialLinks.map(({ name, href, icon: Icon }) => (
              <a
                key={name}
                className="footerSocialLink"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div className="footerPoweredBy">
          <span className="footerPoweredByLabel">Powered by</span>
          <div className="footerPoweredByLogos">
            {poweredByLogos.map(({ name, src }) => (
              <span className="footerPoweredByLogo" key={name}>
                <img src={src} alt={name} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="footerBottom">
        <span>
          © {new Date().getFullYear() === 2026 ? "2026" : `2026 – ${new Date().getFullYear()}`} Go by
          17Bytes. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

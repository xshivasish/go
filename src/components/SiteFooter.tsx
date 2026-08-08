import logo from "../assets/0.png";
import paypalLogo from "../assets/paypal.svg";

function RazorpayMark() {
  return (
    <svg className="paymentMarkIcon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14.6 2 4 14.2h6.4L8.2 22 20 8.7h-6.6L14.6 2Z" fill="#0A2540" />
    </svg>
  );
}

const paymentMethods = [
  { name: "Razorpay", render: () => <RazorpayMark /> },
  { name: "PayPal", render: () => <img className="paymentMarkImg" src={paypalLogo} alt="PayPal" /> },
];

export function SiteFooter() {
  return (
    <footer className="specialFooter">
      <div className="footerMain">
        <a className="footerLogo" href="/">
          <img src={logo} alt="Go" />
          <span>Go by 17Bytes</span>
        </a>
        <p>
          Shorten, manage, and share links with custom aliases, QR codes, temporary expiry,
          analytics, and dashboard controls.
        </p>

        <div className="paymentBadgesRow">
          <span className="paymentBadgesLabel">Supported payments</span>
          <div className="paymentBadges">
            {paymentMethods.map(({ name, render }) => (
              <span className="paymentBadge" key={name}>
                <span className="paymentMarkChip">{render()}</span>
                {name}
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

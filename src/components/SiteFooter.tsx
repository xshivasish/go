import logo from "../assets/0.png";
import razorpayLogo from "../assets/razorpay.svg";
import paypalLogo from "../assets/paypal.svg";

const poweredByLogos = [
  { name: "Razorpay", src: razorpayLogo },
  { name: "PayPal", src: paypalLogo },
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

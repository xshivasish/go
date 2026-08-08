import logo from "../assets/0.png";

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

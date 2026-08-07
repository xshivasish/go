<<<<<<< HEAD
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
=======
import type { FooterPageKey } from "../types";
import logo from "../assets/0.png";

type SiteFooterProps = {
  onOpenPage: (key: FooterPageKey) => void;
};

export function SiteFooter({ onOpenPage }: SiteFooterProps) {
  return (
    <footer className="specialFooter">
      <div className="footerMain">
        <div className="footerBrand">
          <a className="footerLogo" href="/">
            <img src={logo} alt="Go" />
            <span>Go by 17Bytes</span>
          </a>
          <p>
            <strong>
              Shorten, manage, and share links with custom aliases, QR codes, temporary expiry,
              analytics, and dashboard controls.
            </strong>
          </p>
        </div>

        <div className="footerLinks">
          <div>
            <strong>Legal</strong>
            <button className="footerTextButton" onClick={() => onOpenPage("terms")}>Terms</button>
            <button className="footerTextButton" onClick={() => onOpenPage("privacy")}>Privacy</button>
            <button className="footerTextButton" onClick={() => onOpenPage("refunds")}>Refunds</button>
          </div>
          <div>
            <strong>Trust</strong>
            <button className="footerTextButton" onClick={() => onOpenPage("acceptableUse")}>Use policy</button>
            <button className="footerTextButton" onClick={() => onOpenPage("abuse")}>Report abuse</button>
            <button className="footerTextButton" onClick={() => onOpenPage("contact")}>Contact</button>
          </div>
          <div>
            <strong>About us</strong>
            <a href="https://17bytes.com" target="_blank" rel="noreferrer">17Bytes</a>
          </div>
        </div>
>>>>>>> bdca268102e7abba19eac5893975cd5601d8ea8b
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

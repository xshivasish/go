import { Moon, Sun } from "lucide-react";
import type { Theme } from "../types";
import logo from "../assets/0.png";

type HeaderProps = {
  theme: Theme;
  onToggleTheme: () => void;
  authLoading: boolean;
  isSignedIn: boolean;
  userEmail?: string;
  hasPaidPlan: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
};

function ThemeSwitch({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      className={`themeSwitch ${theme === "dark" ? "themeSwitchDark" : "themeSwitchLight"}`}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      onClick={onToggle}
    >
      <span className="themeSwitchTrack">
        <span className="themeSwitchThumb">
          {theme === "light" ? (
            <Sun size={13} strokeWidth={2.5} />
          ) : (
            <Moon size={13} strokeWidth={2.5} />
          )}
        </span>
      </span>
    </button>
  );
}

export function Header({
  theme,
  onToggleTheme,
  authLoading,
  isSignedIn,
  userEmail,
  hasPaidPlan,
  onOpenSettings,
  onSignOut,
  onSignIn,
}: HeaderProps) {
  return (
    <header className="topNav">
      <a className="brand" href="/">
        <img src={logo} alt="Go" />
        <span>Go</span>
        {hasPaidPlan && <em className="brandPlanText">Lifetime</em>}
      </a>

      <div className="navActions">
        {authLoading ? (
          <span className="navMuted">Checking...</span>
        ) : isSignedIn ? (
          <>
            <span className="accountPill">{userEmail || "Signed in"}</span>
            <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
            <button className="settingsHeaderButton" title="Account settings" onClick={onOpenSettings}>
              Settings
            </button>
            <button className="signOutHeaderButton" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
            <button className="primaryButton navButton" onClick={onSignIn}>
              Sign in
            </button>
          </>
        )}
      </div>
    </header>
  );
}

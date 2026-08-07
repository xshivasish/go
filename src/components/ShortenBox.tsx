import { guestExpiryOptions } from "../constants/misc";

type ShortenBoxProps = {
  url: string;
  onUrlChange: (value: string) => void;
  expiresIn: string;
  onExpiresInChange: (value: string) => void;
  loading: boolean;
  onSubmit: () => void;
};

export function ShortenBox({
  url,
  onUrlChange,
  expiresIn,
  onExpiresInChange,
  loading,
  onSubmit,
}: ShortenBoxProps) {
  return (
    <section className="shortenBox" id="shorten">
      <div className="shortenTabs">
        <div>
          <strong>Shorten a long link</strong>
          <span>No account required for temporary links</span>
        </div>
        <span className="freeBadge">Free</span>
      </div>

      <div className="guestInput guestInputWithExpiry">
        <input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="Paste a long URL"
          onKeyDown={(event) => {
            if (event.key === "Enter" && url && !loading) onSubmit();
          }}
        />

        <select
          className="expirySelect"
          value={expiresIn}
          onChange={(event) => onExpiresInChange(event.target.value)}
          aria-label="Temporary link expiry"
        >
          {guestExpiryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button className="primaryButton" disabled={!url || loading} onClick={onSubmit}>
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </div>

      <p className="helperText">
        Want custom aliases, QR codes, analytics, and permanent links? Sign in and use your
        dashboard.
      </p>
    </section>
  );
}

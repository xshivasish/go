type HeroSectionProps = {
  onGetStarted: () => void;
};

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="hero">
      <p className="heroLabel">।। जय श्री राम ।।</p>
      <h1>Short links, big results</h1>
      <p className="heroCopy">
        A simple link shortener for temporary links, custom aliases, analytics, QR codes, and
        full link management.
      </p>

      <div className="heroCtas">
        <button className="primaryButton largeButton" onClick={onGetStarted}>
          Get started
        </button>
        <a className="outlineButton largeButton anchorButton" href="#shorten">
          Create a link
        </a>
      </div>
    </section>
  );
}

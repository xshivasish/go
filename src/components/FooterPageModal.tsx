import type { FooterPageContent } from "../types";
import { Modal } from "./Modal";

type FooterPageModalProps = {
  page: FooterPageContent;
  onClose: () => void;
};

export function FooterPageModal({ page, onClose }: FooterPageModalProps) {
  return (
    <Modal onClose={onClose} panelClassName="footerPagePanel" ariaLabel={page.title}>
      <div className="footerPageHeader">
        <p className="sectionKicker">{page.eyebrow}</p>
        <h2>{page.title}</h2>
        <p>{page.intro}</p>
      </div>

      <div className="footerPageGrid">
        {page.sections.map((section) => (
          <article className="footerPageCard" key={section.heading}>
            <h3>{section.heading}</h3>
            <p>{section.body}</p>
          </article>
        ))}
      </div>
    </Modal>
  );
}

import { Download } from "lucide-react";
import { Modal } from "./Modal";

type QrCodeModalProps = {
  code: string;
  svg: string;
  loading: boolean;
  onDownload: () => void;
  onClose: () => void;
};

export function QrCodeModal({ code, svg, loading, onDownload, onClose }: QrCodeModalProps) {
  return (
    <Modal onClose={onClose} panelClassName="popupPanel qrPanel" ariaLabel={`QR code for ${code}`}>
      <div className="dashboardHeader">
        <div>
          <p className="sectionKicker">QR Code</p>
          <h2>{code}</h2>
          <p className="helperText">Scan or download this QR code as SVG.</p>
        </div>

        <button className="outlineButton" disabled={!svg} onClick={onDownload}>
          <Download size={15} strokeWidth={2.25} />
          Download SVG
        </button>
      </div>

      {loading ? (
        <div className="emptyState">Generating QR code...</div>
      ) : svg ? (
        <div className="qrPreview" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="emptyState">No QR code loaded.</div>
      )}
    </Modal>
  );
}

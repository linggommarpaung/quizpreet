// client/src/components/ui/PdfMateriReader.jsx
import React from 'react';
import { Document, Page } from 'react-pdf';
import { FaSpinner, FaClock } from 'react-icons/fa6';
import styles from '../../pages/ForumPage.module.css';

const PdfMateriReader = ({
  pdfUrl,
  pdfPage,
  numPages,
  onDocumentLoadSuccess,
  pageTimers,
  unlockedPages,
  canNextPdf,
  setPdfPage,
  setActiveMateriSubTab
}) => {
  return (
    <div className={styles.pdfReaderCanvasFrame}>
      <div className={styles.pdfRealContainerStyle}>
        {pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <FaSpinner className={styles.spinnerIconAnim} />
                <p style={{ fontSize: '0.8rem', marginTop: '6px', color: '#fff' }}>Memproses file PDF...</p>
              </div>
            }
            error={<p style={{ color: '#ef4444', fontSize: '0.85rem', padding: '10px' }}>Gagal memuat dokumen PDF.</p>}
          >
            <Page 
              pageNumber={pdfPage} 
              renderTextLayer={true} 
              renderAnnotationLayer={false}
              height={window.innerHeight * 0.55} 
            />
          </Document>
        ) : (
          <p style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>File PDF belum disisipkan.</p>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted, #475569)', marginTop: '10px', marginBottom: '2px' }}>
        Halaman {pdfPage} dari {numPages || '...'}
      </p>

      <div className={styles.pdfActionBottomControls}>
        <button disabled={pdfPage === 1} onClick={() => setPdfPage(p => p - 1)} className={styles.controlNavPdfBtn}>Mundur</button>
        {!unlockedPages[pdfPage] && pageTimers[pdfPage] > 0 && (
          <span className={styles.timerBadgeAlert}><FaClock /> {pageTimers[pdfPage]}s</span>
        )}
        {numPages && pdfPage < numPages ? (
          <button disabled={!canNextPdf} onClick={() => setPdfPage(p => p + 1)} className={styles.controlNavPdfBtn}>Maju</button>
        ) : (
          <button disabled={!canNextPdf || !numPages} onClick={() => setActiveMateriSubTab('latihan')} className={styles.nextStepActionOrangeBtn}>Mulai Latihan</button>
        )}
      </div>
    </div>
  );
};

export default PdfMateriReader;

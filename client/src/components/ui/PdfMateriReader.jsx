// client/src/components/ui/PdfMateriReader.jsx
import React, { useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { FaSpinner, FaClock, FaPlus, FaMinus } from 'react-icons/fa6';
import styles from './PdfMateriReader.module.css';

const PdfMateriReader = ({
  pdfUrl,
  pdfPage,
  numPages,
  onDocumentLoadSuccess,
  pageTimers,
  unlockedPages,
  canNextPdf,
  setPdfPage,
  setActiveMateriSubTab,
  scale = 1.0,  
  setScale      
}) => {
  const touchStartDistRef = useRef(0);
  const touchStartScaleRef = useRef(1.0);

  // 📐 Ukuran ideal proporsional kertas A5 internasional
  const baseHeight = window.innerHeight * 0.48;
  const baseWidth = baseHeight / 1.4142; 

  // Menghitung jarak dua jari untuk fitur murni pinch-to-zoom HP
  const getTouchDistance = (e) => {
    if (e.touches.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2 && setScale) {
      touchStartDistRef.current = getTouchDistance(e);
      touchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && setScale && touchStartDistRef.current > 0) {
      if (e.cancelable) e.preventDefault();

      const currentDist = getTouchDistance(e);
      if (currentDist === 0) return;

      const factor = currentDist / touchStartDistRef.current;
      const newScale = Math.max(1.0, Math.min(2.5, touchStartScaleRef.current * factor));
      
      setScale(Math.round(newScale * 100) / 100);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = 0;
  };

  const handleZoomIn = () => {
    if (setScale) setScale(prev => Math.min(2.5, prev + 0.25));
  };

  const handleZoomOut = () => {
    if (setScale) setScale(prev => Math.max(1.0, prev - 0.25));
  };

  const handleResetZoomClick = () => {
    if (setScale) setScale(1.0);
  };

  return (
    <div className={styles.pdfReaderCanvasFrame}>
      {/* Container utama viewport yang menangani overflow gulir */}
      <div 
        className={styles.pdfRealContainerStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
            {/* 🌟 FIX UTAMA: Area expander fisik yang melebar sempurna ke kanan dan bawah */}
            <div
              className={styles.pdfScrollViewportExpander}
              style={{
                width: baseWidth * scale,
                height: baseHeight * scale,
                transition: touchStartDistRef.current > 0 ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out'
              }}
            >
              {/* Pembungkus akselerasi GPU (transform scale) dengan poros tengah presisi */}
              <div 
                className={styles.pdfA5PaperWrapper}
                style={{
                  width: baseWidth,
                  height: baseHeight,
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center', 
                  transition: touchStartDistRef.current > 0 ? 'none' : 'transform 0.15s ease-out',
                  // Menggeser posisi koordinat elemen ke kanan bawah secara presisi saat membesar
                  left: `${(baseWidth * (scale - 1)) / 2}px`,
                  top: `${(baseHeight * (scale - 1)) / 2}px`
                }}
              >
                <Page 
                  pageNumber={pdfPage} 
                  renderTextLayer={true} 
                  renderAnnotationLayer={false}
                  width={baseWidth} 
                />
              </div>
            </div>
          </Document>
        ) : (
          <p style={{ padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>File PDF belum disisipkan.</p>
        )}
      </div>

      <div className={styles.pdfMetaInfoToolbarRow}>
        <p className={styles.pageDisplayNumberLabel}>
          Halaman {pdfPage} dari {numPages || '...'}
        </p>
        
        {pdfUrl && setScale && (
          <div className={styles.zoomActionControlGroup}>
            <button className={styles.zoomMiniBtn} onClick={handleZoomOut} title="Perkecil">
              <FaMinus />
            </button>
            <span 
              className={styles.scalePercentBadge} 
              onClick={handleResetZoomClick}
              title="Klik untuk Reset ke 100%"
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button className={styles.zoomMiniBtn} onClick={handleZoomIn} title="Perbesar">
              <FaPlus />
            </button>
          </div>
        )}
      </div>

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

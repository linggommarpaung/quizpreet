import React from 'react';
import styles from './Modal.module.css';

const Modal = ({ isOpen, onClose, title, children, onConfirm, confirmText = 'Konfirmasi', confirmVariant = 'danger' }) => {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClass = confirmVariant === 'danger' ? styles.confirmButtonDanger : styles.confirmButtonWarning;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <div className={styles.body}>
          {children}
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>Batal</button>
          <button onClick={onConfirm} className={confirmButtonClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

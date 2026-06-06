// client/src/components/ui/KebabMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './KebabMenu.module.css';
import { FaEllipsisV } from 'react-icons/fa';

const KebabMenu = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    const toggleMenu = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className={styles.kebabContainer} ref={menuRef}>
            <button onClick={toggleMenu} className={styles.kebabButton}>
                <FaEllipsisV />
            </button>
            {isOpen && (
                <div className={styles.kebabMenu} onClick={(e) => e.stopPropagation()}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default KebabMenu;

// client/src/components/ui/SprinkleAnimation.jsx

import React, { useMemo } from 'react';
import styles from './SprinkleAnimation.module.css';

const SprinkleAnimation = () => {
  // Membuat konfigurasi 60 partikel secara acak (warna, arah, tinggi, dan rotasi)
  const sprinkles = useMemo(() => {
    const colors = ['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#fde047'];
    
    return Array.from({ length: 60 }).map((_, i) => {
      // Setengah di kiri, setengah di kanan
      const isLeft = i % 2 === 0;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // X bergerak ke tengah (positif untuk kiri, negatif untuk kanan)
      const tx = isLeft ? Math.random() * 400 + 50 : -(Math.random() * 400 + 50);
      // Y melesat ke atas (nilai negatif di CSS)
      const ty = -(Math.random() * 600 + 300);
      // Rotasi berputar bebas
      const rot = Math.random() * 720 - 360;
      // Sedikit delay agar ledakan terasa natural (tidak kaku)
      const delay = Math.random() * 0.3;
      // Bentuk acak: kotak memanjang atau lingkaran
      const isCircle = Math.random() > 0.5;

      return { isLeft, color, tx, ty, rot, delay, isCircle };
    });
  }, []);

  return (
    <div className={styles.sprinkleContainer}>
      {sprinkles.map((sp, idx) => (
        <div
          key={idx}
          className={`${styles.sprinkle} ${sp.isLeft ? styles.leftOrigin : styles.rightOrigin}`}
          style={{
            backgroundColor: sp.color,
            borderRadius: sp.isCircle ? '50%' : '4px',
            width: sp.isCircle ? '10px' : '6px',
            height: sp.isCircle ? '10px' : '16px',
            '--tx': `${sp.tx}px`,
            '--ty': `${sp.ty}px`,
            '--rot': `${sp.rot}deg`,
            animationDelay: `${sp.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default SprinkleAnimation;

import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', style = {} }) => {
  return (
    <div
      className={`glass-panel ${className}`}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '2px solid var(--glass-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: `
          0 8px 32px 0 rgba(31, 38, 135, 0.37),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
        `,
        ...style
      }}
    >
      {children}
    </div>
  );
};

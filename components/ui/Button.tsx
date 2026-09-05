import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  disabled,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center px-4 py-2.5 rounded-enterprise text-sm font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'secondary'
      ? 'bg-white text-primary-text border border-border hover:bg-background'
      : 'bg-ai-blue text-white hover:bg-blue-700';

  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;

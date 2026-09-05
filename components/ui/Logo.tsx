import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', light = false }) => {
  const sizeClass = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const markSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`${markSize} rounded-enterprise flex items-center justify-center ${
          light ? 'bg-white/10' : 'bg-ai-blue'
        }`}
      >
        <span className="text-white font-semibold">L</span>
      </div>
      <span className={`${sizeClass} font-semibold ${light ? 'text-white' : 'text-primary-text'}`}>
        LedgerCraft
      </span>
    </div>
  );
};

export default Logo;

import React from 'react';

const FinancialVisualization: React.FC = () => {
  return (
    <div className="w-full h-48 relative flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="300" height="200" fill="url(#grid)" />
        
        {/* Data points */}
        <circle cx="30" cy="150" r="3" fill="#22c55e" opacity="0.7" />
        <circle cx="70" cy="120" r="3" fill="#22c55e" opacity="0.7" />
        <circle cx="110" cy="100" r="3" fill="#22c55e" opacity="0.7" />
        <circle cx="150" cy="80" r="3" fill="#22c55e" opacity="0.7" />
        <circle cx="190" cy="70" r="3" fill="#22c55e" opacity="0.7" />
        <circle cx="230" cy="90" r="3" fill="#22c55e" opacity="0.7" />
        <circle cx="270" cy="110" r="3" fill="#22c55e" opacity="0.7" />
        
        {/* Line connecting points */}
        <polyline
          points="30,150 70,120 110,100 150,80 190,70 230,90 270,110"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1"
          opacity="0.5"
        />
        
        {/* Upward arrow */}
        <g opacity="0.6">
          <line x1="280" y1="50" x2="280" y2="120" stroke="#22c55e" strokeWidth="2"/>
          <polygon points="280,50 275,60 285,60" fill="#22c55e"/>
        </g>
      </svg>
    </div>
  );
};

export default FinancialVisualization;

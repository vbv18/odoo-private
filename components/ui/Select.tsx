import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-[#111827] mb-1.5">
          {label}
          {props.required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full px-3.5 py-2.5 text-[14px] text-[#111827] bg-white border rounded-enterprise 
          transition-all duration-150 
          focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent
          disabled:bg-[#F7F8FA] disabled:text-[#98A2B3] disabled:cursor-not-allowed
          ${error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-[#E5E7EB]'}
          ${className}`}
        {...props}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
};

import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-3xl font-bold text-primary-text mb-2">{title}</h1>
        {description && <p className="text-secondary-text">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default PageHeader;

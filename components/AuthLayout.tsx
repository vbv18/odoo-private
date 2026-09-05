import React from 'react';
import { Logo } from './ui/Logo';
import FinancialVisualization from './auth/FinancialVisualization';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex lg:w-1/2 bg-[#0B1F3A] flex-col justify-between p-12">
        <Logo light />
        <div>
          <h2 className="text-3xl font-semibold text-white mb-3">
            Financial operations, simplified
          </h2>
          <p className="text-slate-300 mb-8 max-w-md">
            Enterprise accounting, invoices, and risk insights in one workspace.
          </p>
          <FinancialVisualization />
        </div>
        <p className="text-slate-500 text-sm">LedgerCraft</p>
      </aside>
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-surface border border-border rounded-enterprise p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;

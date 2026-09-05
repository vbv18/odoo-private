import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Logo } from '../ui/Logo';
import { BarChart3, Settings, HelpCircle, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  const router = useRouter();

  const menuItems = [
    { label: 'Dashboard', icon: BarChart3, href: '/dashboard' },
    { label: 'Settings', icon: Settings, href: '/settings' },
    { label: 'Help', icon: HelpCircle, href: '/help' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-enterprise transition-colors duration-150 ${
                isActive
                  ? 'bg-ai-blue text-white'
                  : 'text-secondary-text hover:bg-background'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 border-t border-border space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-enterprise text-danger hover:bg-red-50 transition-colors duration-150"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HiChartBar, 
  HiUsers, 
  HiCube, 
  HiDocumentText, 
  HiPhotograph, 
  HiBriefcase,
  HiCog
} from 'react-icons/hi';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Дашборд', icon: HiChartBar },
    { path: '/clients', label: 'Клиенты', icon: HiUsers },
    { path: '/products', label: 'Товары', icon: HiCube },
    { path: '/listings', label: 'Объявления', icon: HiDocumentText },
    { path: '/content', label: 'Контент', icon: HiPhotograph },
    { path: '/services', label: 'Услуги', icon: HiBriefcase },
    { path: '/settings', label: 'Настройки', icon: HiCog },
  ];

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Авитолог</h1>
        <p className="text-sm text-gray-400 mt-1">Управление маркетплейсами</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 text-xl" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;


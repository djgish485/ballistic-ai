import React, { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-darkBg transition-colors duration-200">
      {children}
    </main>
  );
};

export default Layout;
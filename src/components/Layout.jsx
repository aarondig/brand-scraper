import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-4 py-12">
        {children}
      </main>
    </div>
  );
}

import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-8 h-8 border-4 border-t-white border-white/20 rounded-full animate-spin"></div>
    </div>
  );
};

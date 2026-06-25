import React from 'react';

interface NeoButtonProps {
  variant?: 'yellow' | 'blue' | 'green' | 'red' | 'white' | 'black';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
}

export default function NeoButton({
  children,
  variant = 'yellow',
  size = 'md',
  className = '',
  ...props
}: NeoButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-bold text-black border-4 border-black rounded-[12px] transition-all duration-150 cursor-pointer select-none active:translate-x-[6px] active:translate-y-[6px] active:shadow-none";
  
  const variants = {
    yellow: "bg-[#FFD43B] shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]",
    blue: "bg-[#74C0FC] shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]",
    green: "bg-[#8CE99A] shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]",
    red: "bg-[#FF8787] shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]",
    white: "bg-white shadow-[6px_6px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]",
    black: "bg-black text-white shadow-[6px_6px_0px_rgba(255,212,59,1)] hover:shadow-[3px_3px_0px_rgba(255,212,59,1)] hover:translate-x-[3px] hover:translate-y-[3px] border-4 border-[#FFD43B]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm md:text-base",
    lg: "px-8 py-4 text-base md:text-lg tracking-wide",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

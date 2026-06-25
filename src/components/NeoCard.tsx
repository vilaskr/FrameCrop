import { HTMLAttributes, ReactNode } from 'react';

interface NeoCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  bg?: string;
  className?: string;
}

export default function NeoCard({
  children,
  bg = 'bg-white',
  className = '',
  ...props
}: NeoCardProps) {
  return (
    <div
      className={`border-4 border-black rounded-[12px] p-5 ${bg} shadow-[6px_6px_0px_#000] transition-transform duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

import Image from 'next/image';
import { cn } from '@/lib/utils';
import * as React from 'react';

function Logo(props: { className?: string }) {
  return (
    <div className={cn("relative", props.className)}>
      <Image
        src="/logo.svg"
        alt="LETReview Logo"
        fill
        sizes="(max-width: 768px) 10vw, 96px"
      />
    </div>
  );
}

export default Logo;

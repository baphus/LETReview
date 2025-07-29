import * as React from "react";

function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      {...props}
    >
      <path d="M240 48v160a16 16 0 01-16 16H32a16 16 0 01-16-16V48a16 16 0 0116-16h192a16 16 0 0116 16zM120 52H48v144a4 4 0 004 4h68zm8-4H52a4 4 0 00-4 4v152a4 4 0 004 4h152a4 4 0 004-4V52a4 4 0 00-4-4h-68v156h-4V48zm8 152h68a4 4 0 004-4V52h-72z" />
    </svg>
  );
}

export default Logo;

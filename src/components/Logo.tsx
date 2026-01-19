import * as React from "react";

function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      {...props}
    >
        <path d="M216.7 33.2C200 20.4 165.7 11 128 11S56 20.4 39.3 33.2V26.8C56 14.1 89.5 4 128 4s72 10.1 88.7 22.8v6.4zM37.3 222.8c16.7 12.7 51 22.2 89.7 22.2s73-9.4 89.7-22.2v6.5C200.5 242 166.2 252 128 252s-72.5-10-89.7-22.8v-6.5zM224 224.6c0 3.4-2.6 6.2-6 6.2h-6V25.2h6c3.4 0 6 2.8 6 6.2v193.2zM32 31.4v193.2c0 3.4 2.6 6.2 6 6.2h6V25.2H38c-3.4 0-6 2.8-6 6.2z" />
        <path d="M69 92h25v12H81v52H69V92z" />
        <path d="M117 92h25v12h-13v20h13v12h-13v20h13v12h-25V92z" />
        <path d="M165 92h25v12h-13v52h-12V92z" />
    </svg>
  );
}

export default Logo;

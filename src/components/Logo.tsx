import Image from "next/image";
import * as React from "react";

function Logo(props: Omit<React.ComponentProps<typeof Image>, "src" | "alt">) {
  return (
    <Image
      src="/logo.svg"
      alt="Qwiz Logo"
      width={256}
      height={256}
      {...props}
    />
  );
}

export default Logo;

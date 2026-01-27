
'use client';

export default function FlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="container mx-auto max-w-2xl">{children}</div>;
}

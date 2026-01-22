'use client';

import { useState, useEffect } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { useMDXComponents } from '@mdx-js/react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Skeleton } from './ui/skeleton';

interface MdxRendererProps {
  source: string;
  components?: Record<string, React.ComponentType<any>>;
}

export function MdxRenderer({ source, components = {} }: MdxRendererProps) {
  const [mdxModule, setMdxModule] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const mdxComponents = useMDXComponents(components);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let active = true;

    async function compileMdx() {
      try {
        const mod = await evaluate(source, {
          ...(runtime as any),
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [rehypeRaw, rehypeKatex],
          format: 'mdx'
        });

        if (active) {
          setMdxModule(mod);
          setError(null);
        }
      } catch (e: any) {
        if (active) {
          setError(`MDX compilation error: ${e.message}`);
        }
      }
    }

    setMdxModule(null);
    compileMdx();

    return () => {
      active = false;
    };
  }, [source, isMounted]);

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>;
  }

  if (!isMounted || !mdxModule) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full mt-4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
        </div>
    );
  }

  const Content = mdxModule.default;

  return <Content components={mdxComponents} />;
}

import type { MDXComponents } from 'mdx/types';

function headingId(children: React.ReactNode) {
  return String(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: ({ children, ...props }) => <h2 id={headingId(children)} {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 id={headingId(children)} {...props}>{children}</h3>,
    ...components,
  };
}

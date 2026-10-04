// shadcn/ui Button (v4, new-york), adapted: token colours only, shared focus outline, 40px icon target.
import type * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Charter style: green fill, ink text and an ink outline (green outline on dark backgrounds).
        default:
          'border-2 border-primary-border bg-primary text-primary-foreground hover:bg-primary/85',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border-2 border-foreground bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'border-2 border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/85',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground underline underline-offset-4 hover:decoration-2',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-11 px-6 text-base has-[>svg]:px-4',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

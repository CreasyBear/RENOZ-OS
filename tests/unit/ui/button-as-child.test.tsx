import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/components/ui/button';

describe('Button asChild safety', () => {
  it('does not throw when asChild receives non-element child', () => {
    expect(() => {
      renderToStaticMarkup(<Button asChild>{false as unknown as React.ReactNode}</Button>);
    }).not.toThrow();
  });

  it('falls back safely when asChild receives multiple children', () => {
    expect(() => {
      renderToStaticMarkup(
        <Button asChild>
          {[
            <span key="one">One</span>,
            <span key="two">Two</span>,
          ]}
        </Button>
      );
    }).not.toThrow();

    const html = renderToStaticMarkup(
      <Button asChild>
        {[
          <span key="one">One</span>,
          <span key="two">Two</span>,
        ]}
      </Button>
    );
    expect(html).toContain('One');
    expect(html).toContain('Two');
  });
});

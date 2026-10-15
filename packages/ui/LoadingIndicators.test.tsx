import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Progress } from './Progress';
import { Spinner } from './Spinner';

afterEach(cleanup);

describe('loading indicators', () => {
  it('gives a labelled spinner a status role and hides decorative spinners', () => {
    render(
      <>
        <Spinner label="Loading account" />
        <Spinner data-testid="decoration" />
      </>,
    );
    expect(screen.getByRole('status').getAttribute('aria-label')).toBe('Loading account');
    expect(screen.getByTestId('decoration').getAttribute('aria-hidden')).toBe('true');
  });

  it('associates the progress label and supports determinate and indeterminate progress', () => {
    const { rerender } = render(<Progress label="Upload" value={40} />);
    const progress = screen.getByRole('progressbar', { name: 'Upload' }) as HTMLProgressElement;
    expect(progress.value).toBe(40);
    expect(progress.max).toBe(100);
    rerender(<Progress label="Upload" />);
    expect(progress.hasAttribute('value')).toBe(false);
  });
});

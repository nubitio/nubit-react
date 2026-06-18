import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FileDropzone } from './FileDropzone';

afterEach(cleanup);

describe('FileDropzone', () => {
  it('renders the empty file prompt', () => {
    render(
      <FileDropzone
        inputLabel="Certificate"
        labels={{ prompt: 'Drop .pfx file here or click to browse', hint: '.pfx only' }}
        onFileSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Certificate')).toBeDefined();
    expect(screen.getByText('Drop .pfx file here or click to browse')).toBeDefined();
    expect(screen.getByText('.pfx only')).toBeDefined();
  });

  it('renders selected file metadata', () => {
    render(
      <FileDropzone
        value={{ fileName: 'certificate.pfx', fileUrl: '/media/certificate.pfx' }}
        labels={{ open: 'Open file' }}
        onFileSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('certificate.pfx')).toBeDefined();
    expect(screen.getByText('Open file')).toBeDefined();
  });

  it('renders uploading and error states', () => {
    render(
      <FileDropzone
        value={{ fileName: 'certificate.pfx' }}
        uploading
        error="Upload failed"
        labels={{ uploading: 'Uploading certificate...' }}
        onFileSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Uploading certificate...')).toBeDefined();
    expect(screen.getByRole('alert').textContent).toContain('Upload failed');
  });
});

import './FileDropzone.scss';

import { useDropzone, type Accept } from 'react-dropzone';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function buildDropzoneAccept(accept: string | null | undefined): Accept | undefined {
  if (!accept || accept === '*/*' || accept === '*') return undefined;

  if (accept === 'image/*') {
    return {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    };
  }

  if (accept.includes(',')) {
    return accept.split(',').reduce<Accept>((acc, token) => {
      const trimmed = token.trim();
      if (!trimmed) return acc;
      if (trimmed.startsWith('.')) {
        acc['application/octet-stream'] = [...(acc['application/octet-stream'] ?? []), trimmed];
        return acc;
      }
      acc[trimmed] = [];
      return acc;
    }, {});
  }

  if (accept.startsWith('.')) {
    return { 'application/octet-stream': [accept] };
  }

  return { [accept]: [] };
}

export interface FileDropzoneValue {
  fileName?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
}

export interface FileDropzoneLabels {
  prompt?: string;
  imagePrompt?: string;
  dropPrompt?: string;
  hint?: string;
  imageHint?: string;
  uploading?: string;
  replace?: string;
  remove?: string;
  open?: string;
}

export interface FileDropzoneProps {
  accept?: string | null;
  value?: FileDropzoneValue | null;
  image?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  uploading?: boolean;
  error?: string | null;
  labels?: FileDropzoneLabels;
  inputId?: string;
  inputLabel?: string;
  className?: string;
  onFileSelect: (file: File) => void;
  onClear?: () => void;
}

export function FileDropzone({
  accept,
  value = null,
  image = false,
  disabled = false,
  readOnly = false,
  invalid = false,
  uploading = false,
  error = null,
  labels,
  inputId,
  inputLabel,
  className,
  onFileSelect,
  onClear,
}: FileDropzoneProps) {
  const previewUrl = value?.previewUrl ?? null;
  const fileName = value?.fileName ?? null;
  const fileUrl = value?.fileUrl ?? null;
  const hasContent = !!(previewUrl || fileName);
  const isInteractive = !disabled && !readOnly;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: buildDropzoneAccept(accept),
    disabled: disabled || readOnly || uploading,
    multiple: false,
    noClick: hasContent,
    noKeyboard: hasContent,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) onFileSelect(file);
    },
  });

  const placeholderIcon = image ? 'ph-image' : 'ph-file-arrow-up';
  const placeholderTitle = isDragActive
    ? (labels?.dropPrompt ?? 'Drop file here')
    : image
      ? (labels?.imagePrompt ?? 'Drop image here or click to browse')
      : (labels?.prompt ?? 'Drop file here or click to browse');
  const placeholderHint = image
    ? (labels?.imageHint ?? 'PNG, JPG, WebP or GIF')
    : (labels?.hint ?? 'Select one file');

  return (
    <div
      className={cx(
        'nb-file-dropzone',
        image && 'nb-file-dropzone--image',
        invalid && 'nb-file-dropzone--invalid',
        className,
      )}
    >
      <div
        {...getRootProps({
          className: cx(
            'nb-file-dropzone__zone',
            isDragActive && 'nb-file-dropzone__zone--active',
            hasContent && 'nb-file-dropzone__zone--filled',
            uploading && 'nb-file-dropzone__zone--uploading',
            !isInteractive && 'nb-file-dropzone__zone--disabled',
          ),
        })}
      >
        <input {...getInputProps({ id: inputId, 'aria-label': inputLabel })} />

        {hasContent ? (
          <>
            {previewUrl ? (
              <img
                className="nb-file-dropzone__preview"
                src={previewUrl}
                alt={inputLabel ?? fileName ?? ''}
              />
            ) : (
              <div className="nb-file-dropzone__file">
                <span className="nb-file-dropzone__file-icon" aria-hidden="true">
                  <i className="ph ph-file" />
                </span>
                <div className="nb-file-dropzone__file-meta">
                  <span className="nb-file-dropzone__file-name">{fileName}</span>
                  {fileUrl && (
                    <a
                      className="nb-file-dropzone__file-link"
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {labels?.open ?? 'Open'}
                    </a>
                  )}
                </div>
              </div>
            )}

            {uploading && (
              <div className="nb-file-dropzone__overlay" aria-live="polite">
                <span className="nb-file-dropzone__spinner" aria-hidden="true" />
                <span>{labels?.uploading ?? 'Uploading...'}</span>
              </div>
            )}

            {isInteractive && !uploading && (
              <div className="nb-file-dropzone__actions">
                <button
                  type="button"
                  className="nb-file-dropzone__action"
                  onClick={(event) => {
                    event.stopPropagation();
                    open();
                  }}
                >
                  <i className="ph ph-arrows-clockwise" aria-hidden="true" />
                  {labels?.replace ?? 'Replace'}
                </button>
                {onClear && (
                  <button
                    type="button"
                    className="nb-file-dropzone__action nb-file-dropzone__action--danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      onClear();
                    }}
                  >
                    <i className="ph ph-trash" aria-hidden="true" />
                    {labels?.remove ?? 'Remove'}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="nb-file-dropzone__placeholder">
            <span className="nb-file-dropzone__icon" aria-hidden="true">
              <i className={`ph ${placeholderIcon}`} />
            </span>
            <span className="nb-file-dropzone__title">{placeholderTitle}</span>
            <span className="nb-file-dropzone__hint">{placeholderHint}</span>
          </div>
        )}
      </div>

      {error && (
        <span className="nb-file-dropzone__error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

import './FileUploadField.scss';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import type { CoreHttpClient, CoreTranslationKeys, DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { FormDataRecord } from './FormDataSnapshot';
import type { UploadedFile } from './UploadedFile';

type Translator = (key: keyof CoreTranslationKeys, options?: DataRecord) => string;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function resolveMediaPath(media?: FormDataRecord | null): string | null {
  if (!media) return null;
  const path = media['path'];
  return typeof path === 'string' && path.trim() !== '' ? path : null;
}

function resolveMediaFileName(media?: FormDataRecord | null, fallbackPath?: string | null): string | null {
  if (!media && !fallbackPath) return null;

  const explicitName = media?.['originalName'] ?? media?.['filename'] ?? media?.['name'];
  if (typeof explicitName === 'string' && explicitName.trim() !== '') {
    return explicitName;
  }

  const path = fallbackPath ?? resolveMediaPath(media);
  if (!path) return null;

  const segments = path.split('/');
  const last = segments[segments.length - 1];
  return last?.trim() ? decodeURIComponent(last.split('?')[0] ?? last) : null;
}

function resolveMediaIri(uploadUrl: string, media: FormDataRecord): string | null {
  const atId = media['@id'];
  if (typeof atId === 'string' && atId.trim() !== '') return atId;

  const id = media['id'];
  if (typeof id === 'string' && id.trim() !== '') {
    return `${uploadUrl.replace(/\/+$/, '')}/${id}`;
  }

  return null;
}

function isImageMimeType(mimeType: string | undefined): boolean {
  return !!mimeType && mimeType.startsWith('image/');
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

async function uploadMediaFile(
  file: File,
  uploadUrl: string,
  httpClient: CoreHttpClient,
): Promise<FormDataRecord> {
  const body = new FormData();
  body.append('file', file);
  const response = await httpClient.post<FormDataRecord>(uploadUrl, body);
  return response.data;
}

export interface FileUploadFieldProps {
  field: Field;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  existingMedia?: FormDataRecord | null;
  uploadUrl: string;
  httpClient: CoreHttpClient;
  onUploaded: (entry: UploadedFile) => void;
  onCleared: (fieldName: string) => void;
  t: Translator;
}

export function FileUploadField({
  field,
  disabled = false,
  readOnly = false,
  invalid = false,
  existingMedia = null,
  uploadUrl,
  httpClient,
  onUploaded,
  onCleared,
  t,
}: FileUploadFieldProps) {
  const imageMode = isImageFileField(field);
  const existingPath = resolveMediaPath(existingMedia);
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => (imageMode ? existingPath : null));
  const [fileName, setFileName] = useState<string | null>(() => resolveMediaFileName(existingMedia, existingPath));
  const [fileUrl, setFileUrl] = useState<string | null>(() => existingPath);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const localPreviewRef = useRef<string | null>(null);

  const revokeLocalPreview = useCallback(() => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  }, []);

  useEffect(() => {
    revokeLocalPreview();
    const path = resolveMediaPath(existingMedia);
    setPreviewUrl(imageMode ? path : null);
    setFileName(resolveMediaFileName(existingMedia, path));
    setFileUrl(path);
    setStatus('idle');
    setErrorMessage(null);
  }, [existingMedia, field.name, imageMode, revokeLocalPreview]);

  useEffect(() => () => revokeLocalPreview(), [revokeLocalPreview]);

  const uploadFile = useCallback(async (file: File) => {
    revokeLocalPreview();
    const localUrl = isImageMimeType(file.type) ? URL.createObjectURL(file) : null;
    if (localUrl) {
      localPreviewRef.current = localUrl;
      setPreviewUrl(localUrl);
    } else {
      setPreviewUrl(null);
    }
    setFileName(file.name);
    setFileUrl(localUrl);
    setStatus('uploading');
    setErrorMessage(null);

    try {
      const media = await uploadMediaFile(file, uploadUrl, httpClient);
      const iri = resolveMediaIri(uploadUrl, media);
      if (!iri) {
        throw new Error(t('form.fileUploadInvalidResponse'));
      }

      revokeLocalPreview();
      const remotePath = resolveMediaPath(media);
      const remoteName = resolveMediaFileName(media, remotePath) ?? file.name;
      setFileName(remoteName);
      setFileUrl(remotePath ?? localUrl);
      setPreviewUrl(imageMode && (remotePath || localUrl) ? (remotePath ?? localUrl) : null);
      setStatus('idle');
      onUploaded({ name: field.name, iri });
    } catch (error) {
      revokeLocalPreview();
      const path = resolveMediaPath(existingMedia);
      setPreviewUrl(imageMode ? path : null);
      setFileName(resolveMediaFileName(existingMedia, path));
      setFileUrl(path);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : t('form.fileUploadFailed'));
    }
  }, [existingMedia, field.name, httpClient, imageMode, onUploaded, revokeLocalPreview, t, uploadUrl]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: buildDropzoneAccept(field.accept),
    disabled: disabled || readOnly || status === 'uploading',
    multiple: false,
    noClick: !!(previewUrl || fileName),
    noKeyboard: !!(previewUrl || fileName),
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) void uploadFile(file);
    },
  });

  const handleClear = () => {
    revokeLocalPreview();
    setPreviewUrl(null);
    setFileName(null);
    setFileUrl(null);
    setStatus('idle');
    setErrorMessage(null);
    onCleared(field.name);
  };

  const isInteractive = !disabled && !readOnly;
  const hasContent = !!(previewUrl || fileName);
  const placeholderIcon = imageMode ? 'ph-image' : 'ph-file-arrow-up';
  const placeholderTitle = isDragActive
    ? t('form.fileUploadDrop')
    : imageMode
      ? t('form.imageUploadPrompt')
      : t('form.fileUploadPrompt');
  const placeholderHint = imageMode ? t('form.imageUploadHint') : t('form.fileUploadHint');

  return (
    <div
      className={cx(
        'nb-form__file-upload',
        imageMode && 'nb-form__file-upload--image',
        invalid && 'nb-form__file-upload--invalid',
      )}
    >
      <div
        {...getRootProps({
          className: cx(
            'nb-form__file-upload-zone',
            isDragActive && 'nb-form__file-upload-zone--active',
            hasContent && 'nb-form__file-upload-zone--filled',
            status === 'uploading' && 'nb-form__file-upload-zone--uploading',
            !isInteractive && 'nb-form__file-upload-zone--disabled',
          ),
        })}
      >
        <input {...getInputProps({ id: `nb-form-${field.name}`, 'aria-label': field.label })} />

        {hasContent ? (
          <>
            {previewUrl ? (
              <img
                className="nb-form__file-upload-preview"
                src={previewUrl}
                alt={field.label}
              />
            ) : (
              <div className="nb-form__file-upload-file">
                <span className="nb-form__file-upload-file-icon" aria-hidden="true">
                  <i className="ph ph-file" />
                </span>
                <div className="nb-form__file-upload-file-meta">
                  <span className="nb-form__file-upload-file-name">{fileName}</span>
                  {fileUrl && (
                    <a
                      className="nb-form__file-upload-file-link"
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t('form.fileUploadOpen')}
                    </a>
                  )}
                </div>
              </div>
            )}

            {status === 'uploading' && (
              <div className="nb-form__file-upload-overlay" aria-live="polite">
                <span className="nb-form__file-upload-spinner" aria-hidden="true" />
                <span>{t('form.fileUploading')}</span>
              </div>
            )}

            {isInteractive && status !== 'uploading' && (
              <div className="nb-form__file-upload-actions">
                <button
                  type="button"
                  className="nb-form__file-upload-action"
                  onClick={(event) => {
                    event.stopPropagation();
                    open();
                  }}
                >
                  <i className="ph ph-arrows-clockwise" aria-hidden="true" />
                  {t('form.fileUploadReplace')}
                </button>
                <button
                  type="button"
                  className="nb-form__file-upload-action nb-form__file-upload-action--danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClear();
                  }}
                >
                  <i className="ph ph-trash" aria-hidden="true" />
                  {t('form.fileUploadRemove')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="nb-form__file-upload-placeholder">
            <span className="nb-form__file-upload-icon" aria-hidden="true">
              <i className={`ph ${placeholderIcon}`} />
            </span>
            <span className="nb-form__file-upload-title">{placeholderTitle}</span>
            <span className="nb-form__file-upload-hint">{placeholderHint}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <span className="nb-form__file-upload-error" role="alert">
          <i className="ph ph-warning-circle" aria-hidden="true" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}

export function isImageFileField(field: Field): boolean {
  if (field.type !== FieldType.FILE) return false;
  const accept = field.accept ?? '';
  return accept === '' || accept.includes('image');
}

export function isUploadableFileField(field: Field): field is Field & { url: string } {
  return field.type === FieldType.FILE && !!field.url;
}
import { useCallback, useEffect, useRef, useState } from 'react';
import { FileDropzone, type FileDropzoneValue } from '@nubitio/ui';
import type { CoreHttpClient, CoreTranslationKeys, DataRecord } from '@nubitio/core';
import type { Field } from '../field/Field';
import { FieldType } from '../field/FieldType';
import type { FormDataRecord } from './FormDataSnapshot';
import type { UploadedFile } from './UploadedFile';

type Translator = (key: keyof CoreTranslationKeys, options?: DataRecord) => string;

function resolveMediaPath(media?: FormDataRecord | null): string | null {
  if (!media) return null;
  const path = media['path'];
  return typeof path === 'string' && path.trim() !== '' ? path : null;
}

function resolveMediaFileName(
  media?: FormDataRecord | null,
  fallbackPath?: string | null,
): string | null {
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    imageMode ? existingPath : null,
  );
  const [fileName, setFileName] = useState<string | null>(() =>
    resolveMediaFileName(existingMedia, existingPath),
  );
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

  const uploadFile = useCallback(
    async (file: File) => {
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
    },
    [
      existingMedia,
      field.name,
      httpClient,
      imageMode,
      onUploaded,
      revokeLocalPreview,
      t,
      uploadUrl,
    ],
  );

  const handleClear = () => {
    revokeLocalPreview();
    setPreviewUrl(null);
    setFileName(null);
    setFileUrl(null);
    setStatus('idle');
    setErrorMessage(null);
    onCleared(field.name);
  };

  const value: FileDropzoneValue = {
    fileName,
    fileUrl,
    previewUrl,
  };

  return (
    <FileDropzone
      accept={field.accept}
      disabled={disabled}
      readOnly={readOnly}
      invalid={invalid}
      image={imageMode}
      value={value}
      uploading={status === 'uploading'}
      error={errorMessage}
      inputId={`nb-form-${field.name}`}
      inputLabel={field.label}
      labels={{
        dropPrompt: t('form.fileUploadDrop'),
        prompt: t('form.fileUploadPrompt'),
        imagePrompt: t('form.imageUploadPrompt'),
        hint: t('form.fileUploadHint'),
        imageHint: t('form.imageUploadHint'),
        uploading: t('form.fileUploading'),
        replace: t('form.fileUploadReplace'),
        remove: t('form.fileUploadRemove'),
        open: t('form.fileUploadOpen'),
      }}
      onFileSelect={(file) => void uploadFile(file)}
      onClear={handleClear}
    />
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

/** Triggers a browser "Save As" for an in-memory blob, e.g. an export response. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking in the same tick as click() cancels the download in Firefox and
  // Safari — the navigation to the blob URL has not started yet. One macrotask
  // is enough for every browser to have picked the bytes up.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

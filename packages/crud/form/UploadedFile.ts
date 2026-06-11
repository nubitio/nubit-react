export interface UploadedFile {
  name: string;
  /** Media IRI for JSON submit, or null to clear an existing relation. */
  iri: string | null;
}

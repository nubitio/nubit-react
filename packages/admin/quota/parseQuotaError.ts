export interface ParsedQuotaError {
  resource: string;
  current: number;
  limit: number;
  message: string;
}

function readErrorDetail(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return '';
  }

  const record = error as {
    status?: number;
    data?: { detail?: string; message?: string };
    message?: string;
  };

  return record.data?.detail ?? record.data?.message ?? record.message ?? '';
}

export function parseQuotaError(error: unknown): ParsedQuotaError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const status = (error as { status?: number }).status;
  if (status !== 429) {
    return null;
  }

  const detail = readErrorDetail(error);
  const match = detail.match(/Quota exceeded for "([^"]+)": (\d+)\/(\d+)/);

  if (!match) {
    return {
      resource: 'unknown',
      current: 0,
      limit: 0,
      message: detail || 'Plan limit reached.',
    };
  }

  return {
    resource: match[1],
    current: Number(match[2]),
    limit: Number(match[3]),
    message: detail,
  };
}

export function quotaErrorToastMessage(
  quota: ParsedQuotaError,
  labels?: Partial<Record<string, string>>,
): string {
  const label = labels?.[quota.resource] ?? quota.resource;
  return `Plan limit reached: ${quota.current}/${quota.limit} ${label}. Upgrade your plan to continue.`;
}
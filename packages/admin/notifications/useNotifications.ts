import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCoreHttpClient, useMercureSubscription } from '@nubitio/core';

export interface NotificationItem {
  id: number | string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

/** Reads a Hydra collection body (`hydra:member`) or a plain array — same shape useQuotaUsage relies on. */
function readCollectionItems(body: unknown): NotificationItem[] {
  if (Array.isArray(body)) {
    return body as NotificationItem[];
  }

  if (typeof body !== 'object' || body === null) {
    return [];
  }

  const member =
    (body as Record<string, unknown>)['hydra:member'] ??
    (body as Record<string, unknown>)['member'];

  return Array.isArray(member) ? (member as NotificationItem[]) : [];
}

/** Stable empty reference so `items` keeps its identity while the query is pending. */
const EMPTY_ITEMS: NotificationItem[] = [];

export interface UseNotificationsOptions {
  apiUrl?: string;
  staleTimeMs?: number;
}

/** Fetches the current user's notifications and keeps them live via Mercure — see InAppNotificationChannel on the backend. */
export function useNotifications({
  apiUrl = '/api/notifications',
  staleTimeMs = 10_000,
}: UseNotificationsOptions = {}) {
  const http = useCoreHttpClient();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['nubit-notifications', apiUrl], [apiUrl]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await http.get(apiUrl, { headers: { Accept: 'application/ld+json' } });
      return readCollectionItems(response.data);
    },
    staleTime: staleTimeMs,
  });

  useMercureSubscription(apiUrl, () => void queryClient.invalidateQueries({ queryKey }));

  const markAsReadMutation = useMutation({
    mutationFn: (id: NotificationItem['id']) => http.patch(`${apiUrl}/${id}`, { read: true }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const items = query.data ?? EMPTY_ITEMS;
  const unreadCount = items.filter((item) => !item.read).length;

  // `mutate` is identity-stable in react-query; the mutation object itself is
  // not, so depending on it would hand every consumer a new callback on every
  // render and defeat their memoization.
  const { mutate } = markAsReadMutation;
  const markAsRead = useCallback((id: NotificationItem['id']) => mutate(id), [mutate]);

  return {
    items,
    unreadCount,
    loading: query.isLoading,
    markAsRead,
    refetch: query.refetch,
  };
}

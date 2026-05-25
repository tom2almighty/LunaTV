import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlayRecord } from '@/lib/types';
import { subscribeToDataUpdates } from '@/lib/db/events';
import { playRecordsOptions } from '@/lib/query/options';
import { queryKeys } from '@/lib/query/keys';

export function useHistory() {
  const queryClient = useQueryClient();
  const query = useQuery(playRecordsOptions());

  useEffect(() => {
    return subscribeToDataUpdates<Record<string, PlayRecord>>('playRecordsUpdated', (data) => {
      queryClient.setQueryData(queryKeys.playRecords, data);
    });
  }, [queryClient]);

  return query;
}

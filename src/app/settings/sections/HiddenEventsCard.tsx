'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { RemovedItemsManager, type RemovedItem } from '@/components/settings/RemovedItemsManager';
import { useTimeFormat } from '@/components/providers';
import { eventStartDisplayDate } from '@/lib/utils/timeFormat';
import { toast } from '@/components/ui/use-toast';

type HiddenEvent = {
  id: string;
  title: string;
  startTime: string;
  allDay: boolean;
  calendarName: string | null;
};

type HiddenSeries = {
  id: string;
  title: string;
  calendarName: string | null;
};

// Both lists share one card, so a series id carries a prefix to route Unhide.
const SERIES_PREFIX = 'series:';

/**
 * Events and recurring series hidden in Prism (#592). A hidden event no longer
 * appears anywhere it could be clicked, so this list is the only way to show
 * one again. Renders nothing while the list is empty.
 */
export function HiddenEventsCard() {
  const { displayTimezone } = useTimeFormat();
  const [hidden, setHidden] = useState<HiddenEvent[]>([]);
  const [hiddenSeries, setHiddenSeries] = useState<HiddenSeries[]>([]);
  const [unhidingId, setUnhidingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/events/hidden');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setHidden(data.hidden || []);
        setHiddenSeries(data.hiddenSeries || []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleUnhide = useCallback(async (id: string) => {
    setUnhidingId(id);
    const seriesId = id.startsWith(SERIES_PREFIX) ? id.slice(SERIES_PREFIX.length) : null;
    try {
      const res = await fetch(
        seriesId ? `/api/events/hidden-series/${seriesId}` : `/api/events/${id}/hidden`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        if (seriesId) setHiddenSeries((prev) => prev.filter((e) => e.id !== seriesId));
        else setHidden((prev) => prev.filter((e) => e.id !== id));
      } else {
        toast({ title: 'Failed to unhide event', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to unhide event', variant: 'destructive' });
    } finally {
      setUnhidingId(null);
    }
  }, []);

  const items: RemovedItem[] = [
    ...hiddenSeries.map((s) => ({
      id: SERIES_PREFIX + s.id,
      name: [`Every "${s.title}"`, s.calendarName].filter(Boolean).join(' · '),
    })),
    ...hidden.map((e) => {
      const date = format(eventStartDisplayDate(new Date(e.startTime), e.allDay, displayTimezone), 'EEE, MMM d, yyyy');
      return { id: e.id, name: [e.title, date, e.calendarName].filter(Boolean).join(' · ') };
    }),
  ];

  return (
    <RemovedItemsManager
      title="Hidden events"
      description="Events and series hidden in Prism. They are still in their source calendar; unhide one to show it again."
      items={items}
      onRestore={handleUnhide}
      restoringId={unhidingId}
      restoreLabel="Unhide"
      restoringLabel="Unhiding…"
    />
  );
}

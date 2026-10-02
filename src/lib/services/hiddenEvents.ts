import { and, eq, isNull, notExists, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { events, hiddenEventSeries } from '@/lib/db/schema';

/**
 * The condition every event read path adds so hidden events stay out (#592):
 * not hidden on its own, and not an occurrence of a hidden series. A row with
 * no seriesKey never matches a series, since NULL equals nothing.
 */
export function visibleEventsCondition() {
  return and(
    isNull(events.hiddenAt),
    notExists(
      db
        .select({ one: sql`1` })
        .from(hiddenEventSeries)
        .where(and(
          eq(hiddenEventSeries.calendarSourceId, events.calendarSourceId),
          eq(hiddenEventSeries.seriesKey, events.seriesKey),
        )),
    ),
  );
}

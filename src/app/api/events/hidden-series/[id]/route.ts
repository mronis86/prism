/**
 * Show a hidden recurring series again (#592).
 *
 *   DELETE → drop the hidden_event_series row. Occurrences hidden one at a
 *            time stay hidden; they are unhidden separately.
 *
 * Parents only (canEditAnyEvent).
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { hiddenEventSeries } from '@/lib/db/schema';
import { invalidateEntity } from '@/lib/cache/cacheKeys';
import { logActivity } from '@/lib/services/auditLog';
import { logError } from '@/lib/utils/logError';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRole(auth, 'canEditAnyEvent');
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const [removed] = await db
      .delete(hiddenEventSeries)
      .where(eq(hiddenEventSeries.id, id))
      .returning({ id: hiddenEventSeries.id, title: hiddenEventSeries.title });

    if (!removed) {
      return NextResponse.json({ error: 'Hidden series not found' }, { status: 404 });
    }

    await invalidateEntity('events');

    logActivity({
      userId: auth.userId,
      action: 'update',
      entityType: 'event',
      entityId: removed.id,
      summary: `Unhid the series: ${removed.title}`,
    });

    return NextResponse.json({ id: removed.id, hidden: false });
  } catch (error) {
    logError('Error unhiding series:', error);
    return NextResponse.json({ error: 'Failed to unhide series' }, { status: 500 });
  }
}

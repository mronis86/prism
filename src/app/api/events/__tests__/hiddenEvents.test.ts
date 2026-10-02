/**
 * Hiding an event in Prism (#592): parents only, local only, and listed for
 * Settings so a hidden event can be shown again.
 *
 * requireRole is the real one, so a change to who holds canEditAnyEvent shows
 * up here rather than passing behind a mock.
 */
const mockRequireAuth = jest.fn();
const mockUpdateSet = jest.fn();
const mockReturning = jest.fn();
const mockSelectOrderBy = jest.fn();
const mockSelectWhere = jest.fn();
const mockInsertValues = jest.fn();
const mockInsertReturning = jest.fn();
const mockDeleteReturning = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('@/lib/auth', () => ({
  requireAuth: (...a: unknown[]) => mockRequireAuth(...a),
  requireRole: jest.requireActual('@/lib/auth/requireAuth').requireRole,
}));
jest.mock('@/lib/db/client', () => ({
  db: {
    update: () => ({
      set: (v: unknown) => {
        mockUpdateSet(v);
        return { where: () => ({ returning: (...a: unknown[]) => mockReturning(...a) }) };
      },
    }),
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: () => ({ orderBy: (...a: unknown[]) => mockSelectOrderBy(...a) }),
          orderBy: (...a: unknown[]) => mockSelectOrderBy(...a),
        }),
        where: (...a: unknown[]) => mockSelectWhere(...a),
      }),
    }),
    insert: () => ({
      values: (v: unknown) => {
        mockInsertValues(v);
        return { onConflictDoUpdate: () => ({ returning: (...a: unknown[]) => mockInsertReturning(...a) }) };
      },
    }),
    delete: () => ({ where: () => ({ returning: (...a: unknown[]) => mockDeleteReturning(...a) }) }),
  },
}));
jest.mock('@/lib/db/schema', () => ({
  events: { id: 'id', title: 'title', startTime: 'st', allDay: 'ad', hiddenAt: 'ha', calendarSourceId: 'csid', seriesKey: 'sk' },
  hiddenEventSeries: { id: 'id', title: 'title', calendarSourceId: 'csid', seriesKey: 'sk', createdAt: 'ca' },
  calendarSources: { id: 'id', dashboardCalendarName: 'dcn', displayName: 'dn' },
}));
jest.mock('drizzle-orm', () => ({ eq: jest.fn(), desc: jest.fn(), isNotNull: jest.fn() }));
jest.mock('@/lib/cache/cacheKeys', () => ({ invalidateEntity: (...a: unknown[]) => mockInvalidate(...a) }));
jest.mock('@/lib/services/auditLog', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/utils/logError', () => ({ logError: jest.fn() }));

import { NextRequest } from 'next/server';
import { PUT, DELETE } from '../[id]/hidden/route';
import { GET } from '../hidden/route';
import { DELETE as DELETE_SERIES } from '../hidden-series/[id]/route';

const ctx = { params: Promise.resolve({ id: 'e1' }) };
const req = (method: string, query = '') => new NextRequest(`http://localhost/api/events/e1/hidden${query}`, { method });

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: 'p1', role: 'parent' });
  mockReturning.mockResolvedValue([{ id: 'e1', title: 'Swim practice' }]);
  mockSelectWhere.mockResolvedValue([{ title: 'Swim practice', calendarSourceId: 'cal-1', seriesKey: 'series-abc' }]);
  mockInsertReturning.mockResolvedValue([{ id: 's1' }]);
  mockDeleteReturning.mockResolvedValue([{ id: 's1', title: 'Swim practice' }]);
  mockSelectOrderBy.mockResolvedValue([]);
});

describe('PUT /api/events/[id]/hidden', () => {
  it('stamps hiddenAt and drops the cached event lists', async () => {
    const res = await PUT(req('PUT'), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith({ hiddenAt: expect.any(Date) });
    expect(mockInvalidate).toHaveBeenCalledWith('events');
  });

  it.each(['child', 'guest'])('refuses a %s', async (role) => {
    mockRequireAuth.mockResolvedValue({ userId: 'k1', role });
    const res = await PUT(req('PUT'), ctx);
    expect(res.status).toBe(403);
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('answers 404 for an event that does not exist', async () => {
    mockReturning.mockResolvedValue([]);
    expect((await PUT(req('PUT'), ctx)).status).toBe(404);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/events/[id]/hidden', () => {
  it('clears hiddenAt', async () => {
    const res = await DELETE(req('DELETE'), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdateSet).toHaveBeenCalledWith({ hiddenAt: null });
  });

  it('refuses a child', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'k1', role: 'child' });
    expect((await DELETE(req('DELETE'), ctx)).status).toBe(403);
  });
});

describe('PUT /api/events/[id]/hidden?scope=series', () => {
  it('records the series by source and key, and does not touch the event row', async () => {
    const res = await PUT(req('PUT', '?scope=series'), ctx);
    expect(res.status).toBe(200);
    expect(mockInsertValues).toHaveBeenCalledWith({ calendarSourceId: 'cal-1', seriesKey: 'series-abc', title: 'Swim practice' });
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ id: 'e1', hidden: true, seriesId: 's1' });
    expect(mockInvalidate).toHaveBeenCalledWith('events');
  });

  it('answers 400 for an event with no series', async () => {
    mockSelectWhere.mockResolvedValue([{ title: 'Dentist', calendarSourceId: 'cal-1', seriesKey: null }]);
    expect((await PUT(req('PUT', '?scope=series'), ctx)).status).toBe(400);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('answers 404 for an event that does not exist', async () => {
    mockSelectWhere.mockResolvedValue([]);
    expect((await PUT(req('PUT', '?scope=series'), ctx)).status).toBe(404);
  });

  it('refuses a child', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'k1', role: 'child' });
    expect((await PUT(req('PUT', '?scope=series'), ctx)).status).toBe(403);
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/events/hidden-series/[id]', () => {
  const sctx = { params: Promise.resolve({ id: 's1' }) };

  it('removes the hidden series', async () => {
    const res = await DELETE_SERIES(req('DELETE'), sctx);
    expect(res.status).toBe(200);
    expect(mockInvalidate).toHaveBeenCalledWith('events');
  });

  it('answers 404 when it is not hidden', async () => {
    mockDeleteReturning.mockResolvedValue([]);
    expect((await DELETE_SERIES(req('DELETE'), sctx)).status).toBe(404);
  });

  it('refuses a child', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'k1', role: 'child' });
    expect((await DELETE_SERIES(req('DELETE'), sctx)).status).toBe(403);
  });
});

describe('GET /api/events/hidden', () => {
  it('lists hidden events with their calendar name', async () => {
    mockSelectOrderBy.mockResolvedValueOnce([
      { id: 'e1', title: 'Swim practice', startTime: new Date('2026-10-05T16:00:00Z'), allDay: false, dashboardName: null, displayName: 'Kids' },
      { id: 'e2', title: 'Local thing', startTime: new Date('2026-10-06T00:00:00Z'), allDay: true, dashboardName: null, displayName: null },
    ]).mockResolvedValueOnce([
      { id: 's1', title: 'Piano', dashboardName: 'Kids', displayName: null },
    ]);
    const body = await (await GET()).json();
    expect(body.hidden).toEqual([
      expect.objectContaining({ id: 'e1', calendarName: 'Kids' }),
      expect.objectContaining({ id: 'e2', calendarName: null }),
    ]);
    expect(body.hiddenSeries).toEqual([{ id: 's1', title: 'Piano', calendarName: 'Kids' }]);
  });

  it('refuses a child', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'k1', role: 'child' });
    expect((await GET()).status).toBe(403);
  });
});

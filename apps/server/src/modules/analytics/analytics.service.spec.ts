import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import type { RequestLogRepository, UsageSummaryRow } from './request-log.repository.js';

function build(summaryRow?: Partial<UsageSummaryRow>) {
  const summary = vi.fn().mockResolvedValue({
    requests: 0,
    successes: 0,
    avgLatencyMs: 0,
    totalTokens: 0,
    totalCostSaved: 0,
    ...summaryRow,
  });
  const byProvider = vi.fn().mockResolvedValue([]);
  const page = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
  const repository = { summary, byProvider, page } as unknown as RequestLogRepository;
  return { service: new AnalyticsService(repository), summary, byProvider, page };
}

describe('AnalyticsService (TASK-056)', () => {
  it('defaults to a 24h window and computes success rate', async () => {
    const { service, summary } = build({ requests: 4, successes: 3, avgLatencyMs: 120 });
    const result = await service.summary(1);
    expect(result.window).toBe('24h');
    expect(result.successRate).toBeCloseTo(0.75, 6);
    expect(result.avgLatencyMs).toBe(120);
    // since is ~24h ago
    const since = summary.mock.calls[0]?.[1] as Date;
    expect(Date.now() - since.getTime()).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it('returns successRate 0 when there are no requests', async () => {
    const { service } = build({ requests: 0, successes: 0 });
    expect((await service.summary(1, '7d')).successRate).toBe(0);
  });

  it('rejects an unsupported window', async () => {
    const { service } = build();
    await expect(service.summary(1, '90d')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clamps the page limit and forwards the cursor', async () => {
    const { service, page } = build();
    await service.listLogs(1, 42, 5000);
    expect(page).toHaveBeenCalledWith(1, 200, 42); // clamped to MAX_PAGE_LIMIT
    await service.listLogs(1);
    expect(page).toHaveBeenCalledWith(1, 50, undefined); // default limit
  });
});

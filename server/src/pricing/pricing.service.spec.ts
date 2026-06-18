import { PricingService } from './pricing.service';

describe('PricingService.quote', () => {
  function withRule(rule: unknown) {
    const prisma = {
      pricingRule: { findUnique: jest.fn().mockResolvedValue(rule) },
    };
    return new PricingService(prisma as never);
  }

  it('falls back to the pilot matrix when no rule exists', async () => {
    const svc = withRule(null);
    const quote = await svc.quote('standard', 'near');
    expect(quote.total).toBe(250);
    expect(quote.currency).toBe('GHS');
  });

  it('applies the access surcharge only when requested', async () => {
    const svc = withRule(null);
    const remote = await svc.quote('standard', 'remote', {
      applyAccessSurcharge: true,
    });
    expect(remote.total).toBe(580); // 500 base + 80 surcharge
  });

  it('uses an admin-set pricing rule when present', async () => {
    const svc = withRule({
      basePrice: 300,
      accessSurcharge: 50,
      currency: 'GHS',
    });
    const quote = await svc.quote('large_shared', 'mid', {
      applyAccessSurcharge: true,
    });
    expect(quote.total).toBe(350);
  });
});

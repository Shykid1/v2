import { PaymentsService } from './payments.service';

describe('PaymentsService.splitFor', () => {
  // splitFor is a pure function — no injected dependencies are exercised.
  const svc = new PaymentsService(
    null as never,
    null as never,
    null as never,
    null as never,
  );

  it('splits a job total by the provider percentage', () => {
    expect(svc.splitFor(250, 80)).toEqual({
      providerAmount: 200,
      commissionAmount: 50,
    });
  });

  it('keeps the full remainder as platform commission', () => {
    const { providerAmount, commissionAmount } = svc.splitFor(500, 70);
    expect(providerAmount).toBe(350);
    expect(commissionAmount).toBe(150);
    expect(providerAmount + commissionAmount).toBe(500);
  });

  it('splits without rounding drift', () => {
    const { providerAmount, commissionAmount } = svc.splitFor(355, 85);
    expect(providerAmount + commissionAmount).toBeCloseTo(355, 2);
  });
});

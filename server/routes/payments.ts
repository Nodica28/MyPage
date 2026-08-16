import express, {Request, Response} from "express";

// Billing/Stripe has been removed from this build. Every account is treated as
// Pro with effectively unlimited headshot credits, so these endpoints return a
// static premium status. This keeps the existing client UI (which reads
// `/api/payments/subscription-status`) working without a payment provider.
const router = express.Router();

const PREMIUM_STATUS = {
  subscriptionStatus: "active" as const,
  planType: "pro" as const,
  headshotCredits: 999999,
  subscriptionPeriodEnd: null,
  subscriptionCancelAtPeriodEnd: false,
  isBetaTester: false,
  hasPremiumAccess: true
};

router.get("/subscription-status", (_req: Request, res: Response) => {
  res.json(PREMIUM_STATUS);
});

router.get("/billing-history", (_req: Request, res: Response) => {
  res.json([]);
});

// Safety net: billing is disabled, so acknowledge any other billing call as Pro
// rather than returning a 404 to stray callers.
router.all("*", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Billing is disabled; all accounts are Pro.",
    ...PREMIUM_STATUS
  });
});

export default router;

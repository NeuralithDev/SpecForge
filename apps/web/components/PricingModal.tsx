"use client";

import React, { useState } from "react";
import { PRICING_PLANS, type PlanId, type SupportedCurrency } from "../lib/billing/pricingPlans";

interface PricingModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentPlanId?: PlanId;
  readonly currentUsedEndpoints?: number;
  readonly currentLimit?: number;
  readonly orgId?: string;
  readonly onPlanUpgraded?: (planId: PlanId) => void;
}

export default function PricingModal({
  isOpen,
  onClose,
  currentPlanId = "free",
  currentUsedEndpoints = 0,
  currentLimit = 25,
  orgId = "00000000-0000-0000-0000-000000000000",
  onPlanUpgraded,
}: PricingModalProps) {
  const [currency, setCurrency] = useState<SupportedCurrency>("INR");
  const [processingPlan, setProcessingPlan] = useState<PlanId | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async (planId: PlanId) => {
    if (planId === "free") return;

    setProcessingPlan(planId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          currency,
          orgId,
          email: "customer@enterprise.io",
          returnUrl: window.location.pathname,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to initialize checkout.");
      }

      const checkoutData = (await response.json()) as {
        provider: "razorpay" | "stripe";
        orderId?: string;
        checkoutUrl?: string;
        isTestMode?: boolean;
        keyId?: string;
      };

      if (checkoutData.isTestMode) {
        // In local demo mode, simulate immediate payment success
        const simRes = await fetch("/api/billing/simulate-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            planId,
            provider: checkoutData.provider,
            currency,
          }),
        });

        if (simRes.ok) {
          setSuccessMessage(
            `Payment Simulated Successfully! Your plan was upgraded to ${PRICING_PLANS[planId].name}.`,
          );
          if (onPlanUpgraded) {
            onPlanUpgraded(planId);
          }
          setTimeout(() => {
            onClose();
          }, 2000);
          return;
        }
      }

      // Live Stripe Checkout redirection
      if (checkoutData.provider === "stripe" && checkoutData.checkoutUrl) {
        window.location.href = checkoutData.checkoutUrl;
        return;
      }

      // Live Razorpay modal handling
      if (checkoutData.provider === "razorpay" && checkoutData.orderId) {
        // If razorpay script is loaded
        const win = window as unknown as {
          Razorpay?: new (opts: unknown) => { open: () => void };
        };
        if (win.Razorpay) {
          const rzp = new win.Razorpay({
            key: checkoutData.keyId,
            amount: PRICING_PLANS[planId].prices.INR.amountMinor,
            currency: "INR",
            name: "SpecForge AI",
            description: PRICING_PLANS[planId].name,
            order_id: checkoutData.orderId,
            handler: async (paymentRes: { razorpay_payment_id: string }) => {
              setSuccessMessage(`Payment received! ID: ${paymentRes.razorpay_payment_id}`);
              if (onPlanUpgraded) onPlanUpgraded(planId);
              setTimeout(() => onClose(), 1500);
            },
            theme: { color: "#6366f1" },
          });
          rzp.open();
        } else {
          // Fallback if Razorpay SDK script isn't globally included
          setSuccessMessage(`Simulated Razorpay order created (${checkoutData.orderId}).`);
          if (onPlanUpgraded) onPlanUpgraded(planId);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout error";
      setErrorMessage(msg);
    } finally {
      setProcessingPlan(null);
    }
  };

  const commercialPlans = [
    PRICING_PLANS.sprint_one_time,
    PRICING_PLANS.pro_monthly,
    PRICING_PLANS.enterprise_annual,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="glass-panel w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-950/95 flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-800/80 bg-gradient-to-b from-indigo-950/30 via-slate-900/50 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                SpecForge Enterprise Capacity & Pricing
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Turn reverse-engineered network traffic into verified Model Context Protocol (MCP) servers and TypeScript client SDKs with zero hallucinations.
            </p>
          </div>

          {/* Currency Toggle (INR vs USD) */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setCurrency("INR")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currency === "INR"
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇮🇳 INR (Razorpay)
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currency === "USD"
                  ? "bg-indigo-600 text-white shadow-glow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              USD (Stripe)
            </button>
          </div>
        </div>

        {/* Quota Usage Notification Banner */}
        <div className="px-8 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Current Plan:</span>
            <span className="font-semibold text-white uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
              {currentPlanId}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Monthly Usage:</span>
            <span className="font-mono font-medium text-slate-200">
              {currentUsedEndpoints} / {currentLimit === 999999 ? "∞" : currentLimit} endpoints
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="mx-8 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center space-x-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-8 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center space-x-2">
            <span>⚠</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {commercialPlans.map((plan) => {
            const price = plan.prices[currency];
            const isSelected = currentPlanId === plan.id;
            const isProcessing = processingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between border relative transition-all ${
                  plan.isPopular
                    ? "bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950 border-indigo-500/50 shadow-glow"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Badges */}
                {plan.badge && (
                  <div className="absolute -top-3 left-6">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                        plan.isPopular
                          ? "bg-indigo-600 text-white border-indigo-400"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-white mt-1">{plan.name}</h3>
                  <p className="text-xs text-indigo-400 font-medium">{plan.subtitle}</p>
                  <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{plan.description}</p>

                  {/* Price Block */}
                  <div className="mt-5 pb-5 border-b border-slate-800">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-extrabold text-white tracking-tight">
                        {price.displayPrice}
                      </span>
                      {price.interval !== "one_time" && (
                        <span className="text-xs text-slate-400 font-medium">
                          /{price.interval === "month" ? "mo" : "yr"}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      Capacity: {plan.endpointLimit === 999999 ? "Unlimited" : `${plan.endpointLimit} endpoints`}
                    </span>
                  </div>

                  {/* Feature Bullets */}
                  <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Checkout CTA Button */}
                <div className="mt-8">
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isSelected || isProcessing}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2 ${
                      isSelected
                        ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700"
                        : plan.isPopular
                        ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-glow"
                        : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white"
                    }`}
                  >
                    <span>
                      {isProcessing
                        ? "Connecting..."
                        : isSelected
                        ? "Current Tier"
                        : plan.ctaText}
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    {currency === "INR" ? "Secured by Razorpay · GST Invoice" : "Secured by Stripe · Instant Activation"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/app/shared/components/ui";
import { CustomerPlanDropdownField } from "./CustomerPlanDropdownField";
import { CustomerPlanCheckoutButton } from "./CustomerPlanCheckoutButton";
import { CustomerPlanCheckoutToast } from "./CustomerPlanCheckoutToast";
import { CustomerDashboardCard } from "../shared/CustomerDashboardCard";
import { customerPlansFormatters } from "../../mappers/customerPlansMapper";
import {
  createCustomerPlanCheckoutAction,
  createCustomerTryOnPackCheckoutAction,
} from "../../plans/actions";
import type {
  CustomerPlanProductTier,
  CustomerPlanSummaryCard,
  CustomerPlansViewModel,
} from "../../types/plans";

interface CustomerPlansWorkspaceProps {
  plans: CustomerPlansViewModel;
}

function toneClasses(tone: CustomerPlanSummaryCard["tone"]): string {
  switch (tone) {
    case "green":
      return "text-customer-success-text";
    case "blue":
      return "text-brand-blue";
    case "amber":
      return "text-customer-warning-text";
    case "rose":
      return "text-customer-danger-text";
    default:
      return "text-text-primary";
  }
}

function UsageProgress({ percent }: { percent: number }) {
  return (
    <div className="mt-[0.625vw] h-[0.417vw] overflow-hidden rounded-full bg-customer-soft max-lg:mt-[2vw] max-lg:h-[1.8vw]">
      <span className="block h-full rounded-full bg-brand-blue" style={{ width: `${percent}%` }} />
    </div>
  );
}

function AtGlanceCard({ card, usagePercent }: { card: CustomerPlanSummaryCard; usagePercent?: number }) {
  return (
    <div className="rounded-[0.833vw] border border-customer-border bg-customer-soft px-[1.042vw] py-[0.938vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3.6vw]">
      <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.6vw]">
        {card.label}
      </p>
      <p className={`mt-[0.313vw] text-customer-xl font-semibold tracking-[-0.035em] max-lg:mt-[1vw] max-lg:text-[5vw] ${toneClasses(card.tone)}`}>
        {card.value}
      </p>
      <p className="mt-[0.208vw] text-customer-xs leading-[1.45] text-text-body max-lg:mt-[1vw] max-lg:text-[2.9vw]">
        {card.detail}
      </p>
      {typeof usagePercent === "number" ? <UsageProgress percent={usagePercent} /> : null}
    </div>
  );
}

function productTierValue(tier: CustomerPlanProductTier): string {
  return tier.value;
}

export function CustomerPlansWorkspace({ plans }: CustomerPlansWorkspaceProps) {
  return (
    <div className="flex flex-col gap-[var(--spacing-customer-gap-lg)] max-lg:gap-[5vw]">
      <CustomerPlanCheckoutToast error={plans.checkoutError} />

      <CustomerDashboardCard
        title="Plans"
        description="At a glance. Keep product coverage, included usage, and billing estimate in sync."
      >
        <div className="grid grid-cols-3 gap-[var(--spacing-customer-gap-md)] max-lg:grid-cols-1 max-lg:gap-[3vw]">
          {plans.currentPlanCards.map((card) => (
            <AtGlanceCard
              key={card.label}
              card={card}
              usagePercent={card.label === "Usage this period" ? plans.usage.percent : undefined}
            />
          ))}
        </div>
      </CustomerDashboardCard>

      <div className="grid items-start gap-[var(--spacing-customer-gap-lg)] lg:grid-cols-[minmax(0,1fr)_minmax(20vw,24vw)] max-lg:gap-[5vw]">
        <div className="flex flex-col gap-[var(--spacing-customer-gap-lg)] max-lg:gap-[5vw]">
          <CustomerDashboardCard
            title="Custom Plan Builder"
            description="Choose the product access tier and monthly try-on allowance. The estimate updates automatically."
          >
            <div className="grid grid-cols-3 gap-[var(--spacing-customer-gap-md)] max-xl:grid-cols-1 max-lg:gap-[4vw]">
              <CustomerPlanDropdownField
                key={`product-tier-${plans.quote.productAccessLimit}`}
                label="Product access"
                queryParam="productTier"
                value={String(plans.quote.productAccessLimit)}
                helpText={`${customerPlansFormatters.number(plans.quote.selectedProductCount)} products are selected now.`}
                options={plans.productTiers.map((tier) => ({
                  value: productTierValue(tier),
                  label: tier.label,
                  disabled: tier.disabled,
                }))}
              />

              <CustomerPlanDropdownField
                key={`try-ons-${plans.quote.tryOnPackQuantity}`}
                label="Monthly try-ons"
                queryParam="tryOns"
                value={String(plans.quote.tryOnPackQuantity)}
                helpText="This becomes the recurring included usage."
                options={plans.tryOnPacks.map((pack) => ({
                  value: String(pack.quantity),
                  label: pack.label,
                }))}
              />

              <CustomerPlanDropdownField
                key={`refill-${plans.quote.autoRefillEnabled ? "1" : "0"}`}
                label="Auto-refill"
                queryParam="refill"
                value={plans.quote.autoRefillEnabled ? "1" : "0"}
                helpText="Optional. Off unless you choose it."
                options={[
                  { value: "0", label: "Off" },
                  { value: "1", label: "On" },
                ]}
              />

              <div className="col-span-3 flex items-center justify-between gap-[var(--spacing-customer-gap-md)] border-t border-customer-border pt-[var(--spacing-customer-gap-md)] max-xl:col-span-1 max-lg:flex-col max-lg:items-stretch max-lg:gap-[3vw] max-lg:pt-[4vw]">
                <p className="text-customer-sm leading-[1.55] text-text-body max-lg:text-[3.2vw]">
                  Product access is based on selected products. Change included products from the Products page.
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-customer-border-strong bg-customer-card text-text-body hover:text-brand-blue max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.2vw]"
                >
                  <Link href="/customer/dashboard/products">Products</Link>
                </Button>
              </div>
            </div>
          </CustomerDashboardCard>

          <CustomerDashboardCard
            title="Try-on packages"
            description="Extra try-ons are purchased through Lemon after a monthly plan is active."
          >
            <div className="mb-[var(--spacing-customer-gap-md)] rounded-[0.729vw] border border-customer-border bg-customer-soft px-[0.833vw] py-[0.625vw] text-customer-sm text-text-body max-lg:mb-[4vw] max-lg:rounded-[3vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]">
              {plans.hasActiveMonthlyPlan
                ? "Each package opens a Lemon checkout and adds try-ons to this billing period only."
                : "First purchase a monthly plan. After the plan is active, these try-on packages can be purchased from Lemon for the current billing period."}
            </div>
            <div className="grid grid-cols-3 gap-[var(--spacing-customer-gap-md)] max-xl:grid-cols-2 max-lg:grid-cols-1 max-lg:gap-[3vw]">
              {plans.addOnPacks.map((pack) => (
                <div
                  key={pack.quantity}
                  className="rounded-[0.833vw] border border-customer-border bg-customer-card p-[var(--spacing-customer-gap-md)] max-lg:rounded-[4vw] max-lg:p-[4vw]"
                >
                  <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.6vw]">
                    Lemon add-on
                  </p>
                  <p className="mt-[0.313vw] text-customer-xl font-semibold tracking-[-0.035em] text-text-primary max-lg:mt-[1vw] max-lg:text-[5vw]">
                    {customerPlansFormatters.number(pack.quantity)}
                  </p>
                  <p className="mt-[0.208vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
                    {customerPlansFormatters.money(pack.price)} · {customerPlansFormatters.rate(pack.rate)} each
                  </p>
                  <form action={createCustomerTryOnPackCheckoutAction}>
                    <input type="hidden" name="quantity" value={pack.quantity} />
                    <Button
                      type="submit"
                      disabled={!plans.hasActiveMonthlyPlan}
                      variant="outline"
                      size="sm"
                      className="mt-[var(--spacing-customer-gap-md)] w-full border-customer-border-strong bg-customer-card text-text-body hover:text-brand-blue disabled:bg-customer-soft disabled:text-customer-muted max-lg:mt-[4vw] max-lg:h-[10vw] max-lg:text-[3.2vw]"
                    >
                      {plans.hasActiveMonthlyPlan ? "Buy with Lemon" : "First purchase a plan"}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
            <div className="mt-[var(--spacing-customer-gap-md)] rounded-[0.729vw] border border-customer-border bg-customer-soft px-[0.833vw] py-[0.625vw] text-customer-sm text-text-body max-lg:mt-[4vw] max-lg:rounded-[3vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]">
              When a monthly plan is active, each package opens a Lemon checkout and adds try-ons to this billing period only.
              </div>
          </CustomerDashboardCard>
        </div>

        <CustomerDashboardCard className="lg:sticky lg:top-[calc(var(--spacing-customer-header)+var(--spacing-customer-content-y))]">
          <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.6vw]">
            Estimate
          </p>
          <p className="mt-[0.417vw] text-customer-3xl font-semibold tracking-[-0.05em] text-text-primary max-lg:mt-[1vw] max-lg:text-[8vw]">
            {customerPlansFormatters.money(plans.quote.totalMonthlyPrice)}
            <span className="text-customer-sm font-medium tracking-normal text-customer-muted max-lg:text-[3.2vw]"> / month</span>
          </p>

          <div className="mt-[var(--spacing-customer-gap-lg)] flex flex-col gap-[var(--spacing-customer-gap-sm)] text-customer-sm max-lg:mt-[5vw] max-lg:gap-[2vw] max-lg:text-[3.3vw]">
            <div className="flex justify-between gap-[var(--spacing-customer-gap-md)]">
              <span className="text-text-body">Product access</span>
              <span className="font-semibold text-text-primary">Up to {customerPlansFormatters.number(plans.quote.productAccessLimit)}</span>
            </div>
            <div className="flex justify-between gap-[var(--spacing-customer-gap-md)]">
              <span className="text-text-body">Platform fee</span>
              <span className="font-semibold text-text-primary">{customerPlansFormatters.money(plans.quote.platformFee)}</span>
            </div>
            <div className="flex justify-between gap-[var(--spacing-customer-gap-md)]">
              <span className="text-text-body">Included try-ons</span>
              <span className="font-semibold text-text-primary">{customerPlansFormatters.number(plans.quote.tryOnPackQuantity)}</span>
            </div>
            <div className="flex justify-between gap-[var(--spacing-customer-gap-md)]">
              <span className="text-text-body">Usage fee</span>
              <span className="font-semibold text-text-primary">{customerPlansFormatters.money(plans.quote.tryOnPackPrice)}</span>
            </div>
            <div className="h-px bg-customer-border" />
            <div className="flex justify-between gap-[var(--spacing-customer-gap-md)]">
              <span className="text-text-body">Effective rate</span>
              <span className="font-semibold text-text-primary">{customerPlansFormatters.rate(plans.quote.effectiveTryOnRate)}</span>
            </div>
            <p className="text-customer-success-text">
              Saving {customerPlansFormatters.rate(plans.quote.savingsPerTryOn)} per try-on
            </p>
          </div>

          <form action={createCustomerPlanCheckoutAction}>
            <input type="hidden" name="productCount" value={plans.quote.selectedProductCount} />
            <input type="hidden" name="productAccessLimit" value={plans.quote.productAccessLimit} />
            <input type="hidden" name="requestedTryOns" value={plans.quote.tryOnPackQuantity} />
            <input type="hidden" name="autoRefillEnabled" value={plans.quote.autoRefillEnabled ? "true" : "false"} />
            <CustomerPlanCheckoutButton disabled={!plans.checkoutReady} />
          </form>
          {!plans.checkoutReady ? (
            <p className="mt-[0.625vw] text-customer-xs leading-[1.5] text-customer-muted max-lg:mt-[2vw] max-lg:text-[2.8vw]">
              {plans.checkoutUnavailableMessage}
            </p>
          ) : null}
        </CustomerDashboardCard>
      </div>
    </div>
  );
}

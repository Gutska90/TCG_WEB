import { analyticsEnabled } from "./config";
import { sanitizeAnalyticsProps } from "./analytics-sanitize";

export const ANALYTICS_EVENTS = [
  "app_open",
  "login_success",
  "search",
  "card_view",
  "listing_view",
  "add_to_cart",
  "checkout_started",
  "checkout_completed_sandbox",
  "seller_listing_created",
  "dispute_opened",
  "collection_item_added",
  "collection_item_updated",
  "collection_item_removed",
  "collection_sell_clicked",
  "set_progress_viewed",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export { sanitizeAnalyticsProps };

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void {
  if (!analyticsEnabled()) return;
  const safe = sanitizeAnalyticsProps(props);
  console.info("[analytics]", event, safe ?? {});
}

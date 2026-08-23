-- B3: SALE capture by completedAt; wishlist scan without 5k cap.
CREATE INDEX "orders_status_completed_at_idx" ON "orders"("status", "completed_at");
CREATE INDEX "wishlist_items_notify_below_variant_id_idx" ON "wishlist_items"("notify_below", "variant_id");

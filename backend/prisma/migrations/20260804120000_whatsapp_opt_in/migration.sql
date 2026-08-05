-- WhatsApp Phase A: customer opt-in for transactional notifications
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "whatsapp_opt_in_at" TIMESTAMP(3);

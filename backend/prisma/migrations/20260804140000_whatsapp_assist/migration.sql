-- WhatsApp Phase C: assisted-order bridge flag
ALTER TABLE "whatsapp_threads" ADD COLUMN "needs_assistance" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "whatsapp_threads_needs_assistance_last_message_at_idx" ON "whatsapp_threads"("needs_assistance", "last_message_at");

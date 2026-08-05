-- WhatsApp Phase D: pending Meta cart draft on thread
ALTER TABLE "whatsapp_threads" ADD COLUMN "pending_commerce_json" JSONB;

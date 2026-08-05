-- WhatsApp Phase B: care inbox threads + messages
CREATE TYPE "WhatsappThreadStatus" AS ENUM ('open', 'closed');
CREATE TYPE "WhatsappMessageDirection" AS ENUM ('inbound', 'outbound');

CREATE TABLE "whatsapp_threads" (
    "id" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "customer_id" TEXT,
    "status" "WhatsappThreadStatus" NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "direction" "WhatsappMessageDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_threads_phone_e164_key" ON "whatsapp_threads"("phone_e164");
CREATE INDEX "whatsapp_threads_status_last_message_at_idx" ON "whatsapp_threads"("status", "last_message_at");
CREATE INDEX "whatsapp_threads_customer_id_idx" ON "whatsapp_threads"("customer_id");
CREATE INDEX "whatsapp_messages_thread_id_created_at_idx" ON "whatsapp_messages"("thread_id", "created_at");

ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "whatsapp_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

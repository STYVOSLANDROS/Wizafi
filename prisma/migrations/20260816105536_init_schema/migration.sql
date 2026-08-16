-- CreateEnum
CREATE TYPE "ConnectionMode" AS ENUM ('direct', 'wireguard');

-- CreateEnum
CREATE TYPE "RouterStatus" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'TICKET_PENDING', 'COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED', 'TICKET_FAILED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('CREATED', 'ACTIVATED', 'EXPIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "MikrotikCreationStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'paid', 'rejected');

-- CreateTable
CREATE TABLE "Operator" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Router" (
    "id" SERIAL NOT NULL,
    "site_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "connection_mode" "ConnectionMode" NOT NULL,
    "ddns_or_ip" TEXT NOT NULL,
    "wireguard_pubkey" TEXT,
    "api_username" TEXT NOT NULL,
    "api_password_encrypted" TEXT NOT NULL,
    "hotspot_dns_name" TEXT NOT NULL,
    "public_slug" TEXT NOT NULL,
    "status" "RouterStatus" NOT NULL DEFAULT 'offline',
    "last_checked_at" TIMESTAMP(3),

    CONSTRAINT "Router_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" SERIAL NOT NULL,
    "router_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "duration_label" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "mikrotik_profile_name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "campay_reference" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "router_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'CREATED',
    "mikrotik_creation_status" "MikrotikCreationStatus" NOT NULL DEFAULT 'pending',
    "mikrotik_creation_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Router_public_slug_key" ON "Router"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_campay_reference_key" ON "Transaction"("campay_reference");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_transaction_id_key" ON "Ticket"("transaction_id");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Router" ADD CONSTRAINT "Router_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_router_id_fkey" FOREIGN KEY ("router_id") REFERENCES "Router"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

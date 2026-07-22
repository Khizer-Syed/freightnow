-- CreateTable
CREATE TABLE "FedexAccountConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fedexAccountNumber" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "eulaAcceptedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_factor2',
    "factor2Method" TEXT,
    "pinCodeHash" TEXT,
    "pinExpiresAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "childKey" TEXT,
    "childSecret" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FedexAccountConnection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FedexAccountConnection" ADD CONSTRAINT "FedexAccountConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

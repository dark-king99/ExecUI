-- AlterTable
ALTER TABLE "User" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "provisionedVia" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "ssoSubject" TEXT;

-- CreateTable
CREATE TABLE "SsoConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enforced" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jitProvisioning" BOOLEAN NOT NULL DEFAULT true,
    "defaultRoleId" TEXT,
    "defaultDepartment" TEXT,
    "issuer" TEXT,
    "clientId" TEXT,
    "clientSecretCipher" TEXT,
    "clientSecretIv" TEXT,
    "clientSecretTag" TEXT,
    "authorizationUrl" TEXT,
    "tokenUrl" TEXT,
    "jwksUrl" TEXT,
    "userinfoUrl" TEXT,
    "endSessionUrl" TEXT,
    "scopes" TEXT NOT NULL DEFAULT 'openid email profile',
    "entryPoint" TEXT,
    "idpIssuer" TEXT,
    "idpCert" TEXT,
    "logoutUrl" TEXT,
    "signRequests" BOOLEAN NOT NULL DEFAULT false,
    "spCertificate" TEXT,
    "spKeyCipher" TEXT,
    "spKeyIv" TEXT,
    "spKeyTag" TEXT,
    "signatureAlgorithm" TEXT NOT NULL DEFAULT 'sha256',
    "attrEmail" TEXT NOT NULL DEFAULT 'email',
    "attrFirstName" TEXT NOT NULL DEFAULT 'given_name',
    "attrLastName" TEXT NOT NULL DEFAULT 'family_name',
    "attrExternalId" TEXT,
    "attrGroups" TEXT,
    "groupRoleMap" JSONB NOT NULL DEFAULT '{}',
    "lastLoginAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SsoConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScimToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "createdById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScimToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SsoLoginRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "nonce" TEXT,
    "codeVerifier" TEXT,
    "requestId" TEXT,
    "redirectTo" TEXT,
    "ipAddress" TEXT,
    "userId" TEXT,
    "handoffCode" TEXT,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SsoLoginRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoConnection_tenantId_key" ON "SsoConnection"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ScimToken_tokenHash_key" ON "ScimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ScimToken_tenantId_idx" ON "ScimToken"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SsoLoginRequest_handoffCode_key" ON "SsoLoginRequest"("handoffCode");

-- CreateIndex
CREATE INDEX "SsoLoginRequest_tenantId_idx" ON "SsoLoginRequest"("tenantId");

-- CreateIndex
CREATE INDEX "SsoLoginRequest_expiresAt_idx" ON "SsoLoginRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "User_tenantId_ssoSubject_idx" ON "User"("tenantId", "ssoSubject");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_externalId_key" ON "User"("tenantId", "externalId");

-- AddForeignKey
ALTER TABLE "SsoConnection" ADD CONSTRAINT "SsoConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScimToken" ADD CONSTRAINT "ScimToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SsoLoginRequest" ADD CONSTRAINT "SsoLoginRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


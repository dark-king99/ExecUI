-- SNMPv3 credentials for collectors, and pushing discovered devices into the
-- connected monitoring tool.
ALTER TABLE "NetworkSettings" ADD COLUMN "snmpV3User" TEXT,
ADD COLUMN "snmpV3Level" TEXT NOT NULL DEFAULT 'authPriv',
ADD COLUMN "snmpV3AuthProtocol" TEXT NOT NULL DEFAULT 'sha256',
ADD COLUMN "snmpV3AuthCipher" TEXT,
ADD COLUMN "snmpV3AuthIv" TEXT,
ADD COLUMN "snmpV3AuthTag" TEXT,
ADD COLUMN "snmpV3PrivProtocol" TEXT NOT NULL DEFAULT 'aes',
ADD COLUMN "snmpV3PrivCipher" TEXT,
ADD COLUMN "snmpV3PrivIv" TEXT,
ADD COLUMN "snmpV3PrivTag" TEXT,
ADD COLUMN "monitoringAutoAdd" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "NetworkDevice" ADD COLUMN "monitoringAddedAt" TIMESTAMP(3);

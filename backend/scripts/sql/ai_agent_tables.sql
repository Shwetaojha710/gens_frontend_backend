-- AI WhatsApp Customer Relationship Agent tables (idempotent)
-- Run manually if Sequelize sync is unavailable.

CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL DEFAULT 'Virtual Assistant',
  personality TEXT,
  "systemInstructions" TEXT,
  "companyIntro" TEXT,
  languages JSONB NOT NULL DEFAULT '["en","hi"]'::jsonb,
  "aiProvider" VARCHAR(40) NOT NULL DEFAULT 'gemini',
  "aiModel" VARCHAR(80) NOT NULL DEFAULT 'gemini-2.0-flash',
  "responseLength" VARCHAR(20) NOT NULL DEFAULT 'short',
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL UNIQUE,
  "agentId" UUID NOT NULL,
  "whatsappPhoneNumberId" VARCHAR(80),
  "whatsappBusinessAccountId" VARCHAR(80),
  "whatsappAccessTokenEnc" TEXT,
  "whatsappVerifyToken" VARCHAR(120),
  "whatsappAppSecretEnc" TEXT,
  "llmApiKeyEnc" TEXT,
  "defaultAssigneeId" UUID,
  "notifyOnLead" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnHandover" BOOLEAN NOT NULL DEFAULT true,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_agent_settings_phone_idx ON ai_agent_settings ("whatsappPhoneNumberId");

CREATE TABLE IF NOT EXISTS ai_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "agentId" UUID,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  "fileName" VARCHAR(255),
  "filePath" VARCHAR(500),
  "mimeType" VARCHAR(120),
  "isApproved" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "searchText" TEXT,
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_agent_knowledge_tenant_active_idx ON ai_agent_knowledge ("tenantId", "isActive", "isApproved");

CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "agentId" UUID,
  "waId" VARCHAR(40) NOT NULL,
  "customerPhone" VARCHAR(40) NOT NULL,
  "customerName" VARCHAR(160),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
  "currentIntent" VARCHAR(80),
  "leadId" UUID,
  "assignedTo" UUID,
  "lastMessageAt" TIMESTAMPTZ,
  "lastCustomerMessageAt" TIMESTAMPTZ,
  "windowExpiresAt" TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", "waId")
);

CREATE TABLE IF NOT EXISTS ai_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  direction VARCHAR(20) NOT NULL,
  "senderType" VARCHAR(20) NOT NULL,
  "senderId" UUID,
  "waMessageId" VARCHAR(120),
  "messageType" VARCHAR(40) NOT NULL DEFAULT 'text',
  body TEXT,
  "mediaUrl" VARCHAR(500),
  intent VARCHAR(80),
  confidence DECIMAL(5,4),
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_agent_messages_conv_idx ON ai_agent_messages ("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS ai_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "waId" VARCHAR(40) NOT NULL,
  "conversationId" UUID,
  "customerDetails" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "productsDiscussed" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "questionsAnswered" JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  requirements TEXT,
  "leadStatus" VARCHAR(40),
  "leadPriority" VARCHAR(20),
  "lastInteractionAt" TIMESTAMPTZ,
  notes TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", "waId")
);

CREATE TABLE IF NOT EXISTS ai_agent_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID,
  code VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  description TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("tenantId", code)
);

CREATE TABLE IF NOT EXISTS ai_agent_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "conversationId" UUID,
  "waId" VARCHAR(40),
  "fullName" VARCHAR(160),
  "companyName" VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(40),
  "productInterest" VARCHAR(255),
  "businessRequirements" TEXT,
  "employeeCount" VARCHAR(40),
  budget VARCHAR(80),
  "purchaseTimeline" VARCHAR(80),
  "leadSource" VARCHAR(80) NOT NULL DEFAULT 'whatsapp',
  "leadStatus" VARCHAR(40) NOT NULL DEFAULT 'new',
  "leadPriority" VARCHAR(10) NOT NULL DEFAULT 'COLD',
  "assignedTo" UUID,
  "qualificationScore" INTEGER NOT NULL DEFAULT 0,
  "collectedFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "conversationId" UUID,
  "messageId" UUID,
  "actionType" VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error TEXT,
  "executedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agent_handover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  reason TEXT NOT NULL,
  "triggerType" VARCHAR(40) NOT NULL DEFAULT 'other',
  "assignedTo" UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "conversationSnapshot" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "notifiedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  notes TEXT,
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

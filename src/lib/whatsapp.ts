import dbConnect from './mongodb';
import WhatsappSetting, { IWhatsappSetting } from '@/models/WhatsappSetting';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

export interface WhatsAppPayload {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  template: WhatsAppTemplate;
}

export type WhatsAppTemplate = {
  name: string;
  language: { code: string };
  components?: Array<{
    type: string;
    parameters?: Array<Record<string, unknown>>;
  }>;
  [key: string]: unknown;
};

function getWhatsAppCredentials(userEmail: string, settings: IWhatsappSetting | null) {
  const phoneNumberIdBase = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessTokenBase = process.env.WHATSAPP_BUSINESS_API_TOKEN;

  if (settings?.gowhatsApiToken && settings?.phoneNumberId) {
    const creds = {
      phoneNumberId: settings.phoneNumberId.trim(),
      accessToken: settings.gowhatsApiToken.trim(),
      isCustom: true
    };
    console.log(`[WhatsApp] Using user-specific credentials for ${userEmail}. PhoneID: "${creds.phoneNumberId}"`);
    return creds;
  }

  const creds = {
    phoneNumberId: phoneNumberIdBase?.trim(),
    accessToken: accessTokenBase?.trim(),
    isCustom: false
  };
  console.log(`[WhatsApp] Using official credentials for ${userEmail}. Fallback PhoneID: "${creds.phoneNumberId}"`);
  return creds;
}

function validateCredentials(creds: { phoneNumberId?: string; accessToken?: string }, userEmail: string) {
  if (!creds.phoneNumberId || !creds.accessToken || creds.accessToken.length < 10) {
    const missing = [];
    if (!creds.phoneNumberId) missing.push('Phone Number ID');
    if (!creds.accessToken) missing.push('Access Token (missing or too short)');
    console.error(`[WhatsApp] Invalid credentials for ${userEmail}: ${missing.join(', ')}`);
    throw new Error(`WhatsApp API credentials invalid: ${missing.join(', ')}`);
  }
}

function getEffectiveToken(accessToken: string, userEmail: string) {
  const token = accessToken.trim().replaceAll(/^["']|["']$/g, '');
  if (/[^\x20-\x7E]/.test(token)) {
    console.warn(`[WhatsApp] Warning: Access Token for ${userEmail} contains non-printable characters!`);
  }
  return token;
}

function applyTemplateOverrides(payload: WhatsAppPayload, settings: IWhatsappSetting | null, isCustom: boolean) {
  const templateName = payload.template?.name;
  if (!isCustom || !settings || !templateName) return;

  const mapping: Record<string, keyof typeof settings> = {
    payment_receipt_cashh: 'templateNameCash',
    payment_receipt_upii: 'templateNameUPI',
    payment_receipt_card: 'templateNameCard',
  };

  const settingKey = mapping[templateName];
  const effectiveName = settingKey ? settings[settingKey] : null;

  if (effectiveName) {
    console.log(`[WhatsApp] Using custom template name: ${effectiveName} (Original: ${templateName})`);
    payload.template.name = String(effectiveName);
  }
}

async function handleWhatsAppResponse(response: Response, isCustom: boolean) {
  const data = await response.json();
  
  if (!response.ok) {
    if (isCustom && data.error?.code === 131047) {
      console.warn(`[WhatsApp] Custom integration hit 24-hour window / template limit error.`);
    }
    console.error(`[WhatsApp] API Error (${response.status}):`, data.error);
    throw new Error(data.error?.message || `WhatsApp API error: ${response.status}`);
  }

  console.log(`[WhatsApp] Success! Message ID: ${data.messages?.[0]?.id}`);
  return data;
}

export async function sendWhatsAppMessage(userEmail: string, payload: WhatsAppPayload) {
  await dbConnect();
  const settings = await WhatsappSetting.findOne({ shopId: userEmail });

  const creds = getWhatsAppCredentials(userEmail, settings);
  validateCredentials(creds, userEmail);

  const effectiveToken = getEffectiveToken(creds.accessToken!, userEmail);
  applyTemplateOverrides(payload, settings, creds.isCustom);

  console.log(`[WhatsApp] Sending to ${payload.to} via ${creds.isCustom ? 'User' : 'Official'} API...`);

  const response = await fetch(
    `${WHATSAPP_API_URL}/${creds.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  return handleWhatsAppResponse(response, creds.isCustom);
}

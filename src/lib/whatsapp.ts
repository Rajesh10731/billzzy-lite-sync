import dbConnect from './mongodb';
import WhatsappSetting from '@/models/WhatsappSetting';

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

export async function sendWhatsAppMessage(userEmail: string, payload: WhatsAppPayload) {
  await dbConnect();

  // Fetch settings from the dedicated WhatsappSetting collection
  const settings = await WhatsappSetting.findOne({ shopId: userEmail });

  const phoneNumberIdBase = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessTokenBase = process.env.WHATSAPP_BUSINESS_API_TOKEN;
  let isCustom = false;

  let finalPhoneNumberId: string | undefined;
  let finalAccessToken: string | undefined;

  // Use user-specific credentials if all required fields are present
  if (settings && settings.gowhatsApiToken && settings.phoneNumberId) {
    finalPhoneNumberId = settings.phoneNumberId.trim();
    finalAccessToken = settings.gowhatsApiToken.trim();
    isCustom = true;
    console.log(`[WhatsApp] Using user-specific credentials for ${userEmail}. PhoneID: "${finalPhoneNumberId}", AccessToken length: ${finalAccessToken?.length || 0}`);
  } else {
    finalPhoneNumberId = phoneNumberIdBase?.trim();
    finalAccessToken = accessTokenBase?.trim();
    console.log(`[WhatsApp] Using official credentials for ${userEmail}. Fallback PhoneID: "${finalPhoneNumberId}", AccessToken length: ${finalAccessToken?.length || 0}`);
  }

  // Final validation before fetch
  if (!finalPhoneNumberId || !finalAccessToken || finalAccessToken.length < 10) {
    const missing = [];
    if (!finalPhoneNumberId) missing.push('Phone Number ID');
    if (!finalAccessToken) missing.push('Access Token (missing or too short)');
    console.error(`[WhatsApp] Invalid credentials for ${userEmail}: ${missing.join(', ')}`);
    throw new Error(`WhatsApp API credentials invalid: ${missing.join(', ')}`);
  }

  const effectiveToken = finalAccessToken.trim().replace(/^["']|["']$/g, ''); // Remove wrapping quotes if any

  // Extra check for "Cannot parse access token" error:
  // Ensure the token doesn't contain weird characters
  if (/[^\x20-\x7E]/.test(effectiveToken)) {
    console.warn(`[WhatsApp] Warning: Access Token for ${userEmail} contains non-printable characters!`);
  }

  console.log(`[WhatsApp] Sending to ${payload.to} via ${isCustom ? 'User' : 'Official'} API...`);

  // Support dynamic template names
  const templateName = payload.template?.name;
  let effectiveTemplateName = templateName;

  if (isCustom && settings) {
    if (templateName === 'payment_receipt_cashh' && settings.templateNameCash) {
      effectiveTemplateName = settings.templateNameCash;
    } else if (templateName === 'payment_receipt_upii' && settings.templateNameUPI) {
      effectiveTemplateName = settings.templateNameUPI;
    } else if (templateName === 'payment_receipt_card' && settings.templateNameCard) {
      effectiveTemplateName = settings.templateNameCard;
    }

    if (effectiveTemplateName !== templateName) {
      console.log(`[WhatsApp] Using custom template name: ${effectiveTemplateName} (Original: ${templateName})`);
      payload.template.name = effectiveTemplateName;
    }
  }

  const response = await fetch(
    `${WHATSAPP_API_URL}/${finalPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

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

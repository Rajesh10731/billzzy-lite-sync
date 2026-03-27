// // src/lib/whatsapp-config.ts

// export const whatsappConfig = {
//   phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
//   accessToken: process.env.WHATSAPP_BUSINESS_API_TOKEN,
//   businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,

//   // Validate configuration
//   isValid: (): boolean => {
//     return !!(whatsappConfig.phoneNumberId &&
//       whatsappConfig.accessToken &&
//       whatsappConfig.businessAccountId);
//   },

//   // Get configuration for logging
//   getConfig: () => ({
//     hasPhoneId: !!whatsappConfig.phoneNumberId,
//     hasToken: !!whatsappConfig.accessToken,
//     hasBusinessAccountId: !!whatsappConfig.businessAccountId,
//     businessAccountId: whatsappConfig.businessAccountId
//   })
// };

// // Common template configurations
// export const whatsappTemplates = {
//   invoice_with_payment: {
//     name: "invoice_with_payment",
//     language: { code: "en" }
//   },
//   payment_receipt_cashh: {
//     name: "payment_receipt_cashh",
//     language: { code: "en" }
//   },
//   payment_receipt_upii: {
//     name: "payment_receipt_upii",
//     language: { code: "en" }
//   },
//   payment_receipt_card: {
//     name: "payment_receipt_card",
//     language: { code: "en" }
//   },
//   otp_verification: {
//     name: "login_for_billzzy_lite",
//     language: { code: "en" }
//   }
// };



import { Session } from "next-auth";
import WhatsappSetting from "@/models/WhatsappSetting";
import dbConnect from "@/lib/mongodb";

// 1. Keep your Default Environment Config as a fallback
export const defaultWhatsappConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_BUSINESS_API_TOKEN,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
};

/**
 * 2. New Dynamic Resolver: 
 * Determines if we should use System keys (Free) or Merchant keys (Pro)
 */
export async function getWhatsAppConfig(session: Session | null) {
  const plan = session?.user?.plan;
  const features = session?.user?.features;
  const shopId = session?.user?.email; // Use email as shopId

  // Logic: Only PRO users with the 'customWhatsapp' feature enabled can use custom keys
  if (plan === 'PRO' && features?.customWhatsapp && shopId) {
    await dbConnect();
    const customSettings = await WhatsappSetting.findOne({ shopId });

    // If they have settings configured (check if key fields are present), return them
    if (customSettings && customSettings.phoneNumberId && customSettings.accessToken) {
      return {
        phoneNumberId: customSettings.phoneNumberId,
        accessToken: customSettings.accessToken,
        businessAccountId: customSettings.businessAccountId,
        type: 'CUSTOM'
      };
    }
  }

  // Fallback for FREE users or PRO users who haven't set up custom keys yet
  return {
    ...defaultWhatsappConfig,
    type: 'DEFAULT'
  };
}

// 3. Keep your templates exactly as they were
export const whatsappTemplates = {
  invoice_with_payment: {
    name: "invoice_with_payment",
    language: { code: "en" }
  },
  payment_receipt_cashh: {
    name: "payment_receipt_cashh",
    language: { code: "en" }
  },
  payment_receipt_upii: {
    name: "payment_receipt_upii",
    language: { code: "en" }
  },
  payment_receipt_card: {
    name: "payment_receipt_card",
    language: { code: "en" }
  },
  otp_verification: {
    name: "login_for_billzzy_lite",
    language: { code: "en" }
  }
};
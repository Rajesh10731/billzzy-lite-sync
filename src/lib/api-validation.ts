import dbConnect from './mongodb';
import Tenant from '@/models/Tenant';
import { hashKey } from './api-keys';

/**
 * Validates external API requests using headers
 * x-merchant-id and x-api-key
 */
export async function validateMerchantRequest(req: Request) {
  const { searchParams } = new URL(req.url);

  // Try to get from Headers first, then fall back to Query Params
  let merchantId = req.headers.get('x-merchant-id') || searchParams.get('merchantId');
  let apiKey = req.headers.get('x-api-key') || searchParams.get('apiKey');
  const hook = req.headers.get('x-billzzy-hook') || searchParams.get('hook');

  if (hook && hook.includes(':')) {
    const [hMid, hKey] = hook.split(':');
    merchantId = hMid;
    apiKey = hKey;
  }

  if (!merchantId || !apiKey) return null;

  await dbConnect();

  // Find the tenant using the permanent Merchant ID, subdomain, or ownerEmail
  const tenant = await Tenant.findOne({
    $or: [
      { merchantId: { $regex: new RegExp(`^${merchantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { subdomain: { $regex: new RegExp(`^${merchantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { ownerEmail: { $regex: new RegExp(`^${merchantId.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
    ]
  });

  if (!tenant || !tenant.apiKeyHash) return null;

  // Verify the key
  const incomingHash = hashKey(apiKey);
  if (incomingHash !== tenant.apiKeyHash) return null;

  return tenant;
}

// Export an alias so both "validateMerchantRequest" and "validateExternalRequest" work
export const validateExternalRequest = validateMerchantRequest;
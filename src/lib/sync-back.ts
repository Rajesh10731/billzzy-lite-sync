import axios from 'axios';

export async function pushSaleToMaster(items: any[], tenantId: string,billId: string) {
  try {
    const masterUrl = process.env.NEXT_PUBLIC_BILLZZY_MASTER_URL;
    const secret = process.env.SYNC_SECRET;

    if (!masterUrl || !tenantId) return;

    console.log(`📤 [Sync-Back] Sending ${items.length} items to Master...`);

    // We only send SKU and Quantity
    const payload = items.map(item => ({
      sku: item.sku || item.SKU,
      quantity: item.quantity
    }));

    await axios.post(`${masterUrl}/api/external/record-sale`, {
      items: payload,
      tenantId: tenantId,// This is the MongoDB User ID (_id)
     billId: billId     
    }, {
      headers: { 'x-sync-secret': secret }
    });

    console.log("✅ [Sync-Back] Master Inventory Updated Successfully");
  } catch (error: any) {
    console.error("❌ [Sync-Back] Failed to update Master:", error.message);
  }
}
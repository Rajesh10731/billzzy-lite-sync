import axios from 'axios';

export async function pushSaleToMaster(items: { sku: string, quantity: number }[]) {
  try {
    const masterUrl = process.env.NEXT_PUBLIC_BILLZZY_MASTER_URL;
    const tenantId = localStorage.getItem('tenantid'); // Or wherever you store the User ID

    if (!masterUrl || !tenantId) return;

    await axios.post(`${masterUrl}/api/external/record-sale`, {
      items,
      tenantId
    }, {
      headers: { 'x-sync-secret': process.env.SYNC_SECRET }
    });
    
    console.log("✅ Sale synced back to Billzzy Master");
  } catch (error: any) {
    console.error("❌ Failed to sync sale to Master:", error.message);
  }
}
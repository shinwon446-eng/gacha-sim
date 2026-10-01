import test from "node:test";
import assert from "node:assert/strict";
import { useInventoryStore, type OwnedItem } from "../stores/inventoryStore";
const base = { itemId: "item", boxSlug: "box", valueUsdt: 100, tier: "curated" as const, fair: { serverSeedHash: "h", serverSeed: "s", clientSeed: "c", nonce: 0, roll: 0 } };
const address = { recipient: "Test", country: "US" as const, phone: "+1 555 0100", postalCode: "10001", address: "Test" };
function reset(n = 1) { useInventoryStore.setState({ items: [] }); return useInventoryStore.getState().add(Array.from({ length: n }, () => ({ ...base }))); }
test("shipping fee is allocated once across items and repeated cancellation cannot refund twice", () => {
 const items = reset(3); const store = useInventoryStore.getState();
 store.requestShipping(items.map(i=>i.id),address,10,{crypto:0,card:1});
 assert.equal(useInventoryStore.getState().items.reduce((n,i)=>n+i.shipping!.feeUsdt,0),10);
 let refund=0;
 for(const item of items) {
  const result=store.cancelShipping(item.id); assert.ok(result.ok); assert.equal(result.toCrypto,0); assert.equal(result.toCard,result.refundedUsdt); refund+=result.refundedUsdt;
  assert.equal(store.cancelShipping(item.id).ok,false);
 }
 assert.equal(refund,10); assert.ok(useInventoryStore.getState().items.every(i=>i.status==="IN_STORAGE" && !i.shipping && i.shippingCancellations?.length===1));
});
test("dispatch prevents operational cancellation; status and funds remain unchanged", () => {
 const [item]=reset(); const store=useInventoryStore.getState();
 store.requestShipping([item.id],address,5,{crypto:1,card:0}); store.markShipping(item.id,"DHL","123");
 assert.equal(store.cancelShipping(item.id).ok,false); assert.equal(useInventoryStore.getState().items[0].status,"SHIPPING");
});
test("mixed-source batch refunds preserve the original cents in each funding bucket", () => {
 const items=reset(2);const store=useInventoryStore.getState();
 store.requestShipping(items.map(i=>i.id),address,0.02,{crypto:0.5,card:0.5});
 const refunds=items.map(i=>store.cancelShipping(i.id));
 assert.equal(refunds.reduce((n,r)=>n+r.toCrypto,0),0.01);
 assert.equal(refunds.reduce((n,r)=>n+r.toCard,0),0.01);
});
test("legacy positive shipping fees without original charge evidence cannot be guessed", () => {
 const [item]=reset(); useInventoryStore.setState({items:[{...item,status:"SHIPPING_REQUESTED",shipping:{address,feeUsdt:10,requestedAt:new Date().toISOString()}}]});
 assert.equal(useInventoryStore.getState().cancelShipping(item.id).reason,"unknownFee");
});
test("free preparation cancellation works and a later request gets a new identity", () => {
 const [item]=reset();const store=useInventoryStore.getState();
 store.requestShipping([item.id],address,0); const first=useInventoryStore.getState().items[0].shipping!.requestId;
 assert.equal(store.cancelShipping(item.id).ok,true);store.requestShipping([item.id],address,0);
 assert.notEqual(first,useInventoryStore.getState().items[0].shipping!.requestId);
});

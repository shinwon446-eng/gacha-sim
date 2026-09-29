import test from "node:test";
import assert from "node:assert/strict";
import { vaultTab, recordKind, processedAt, resaleEstimate } from "../lib/vault";
import { canReview, MIN_REVIEW_ITEM_VALUE_USDT } from "../lib/community";
import { useCommunityStore } from "../stores/communityStore";
import { useInventoryStore, type OwnedItem } from "../stores/inventoryStore";
const item: OwnedItem = {
 id:"fixture", itemId:"ctd-cable", boxSlug:"jackpot-cybertruck", valueUsdt:0.11, tier:"curated", status:"IN_STORAGE", acquiredAt:"2026-09-01T00:00:00Z",
 fair:{serverSeedHash:"h",serverSeed:"s",clientSeed:"c",nonce:1,roll:1},
 shipping:{address:{recipient:"Test",country:"US",phone:"000",postalCode:"000",address:"Test"},feeUsdt:0,requestedAt:"2026-09-02T00:00:00Z"}
};
test("active shipments and confirmed deliveries never appear in the financial archive", () => {
 for (const status of ["SHIPPING_REQUESTED","SHIPPING","DELIVERED"] as const) assert.equal(vaultTab({...item,status}),"shipping");
 assert.equal(vaultTab({...item,status:"SOLD"}),"done");
 assert.equal(vaultTab(item),"held");
 assert.equal(recordKind({...item,status:"DELIVERED"}),"delivered");
});
test("archive ordering uses processing dates and does not invent missing dates", () => {
 assert.equal(processedAt({...item,status:"SOLD",soldAt:"2026-09-20T00:00:00Z"}),"2026-09-20T00:00:00Z");
 assert.equal(processedAt({...item,status:"SOLD"}),undefined);
 assert.equal(processedAt({...item,status:"SHIPPING_REQUESTED"}),item.shipping?.requestedAt);
});
test("resale estimates sum individual rounded refunds, excluding processed records", () => {
 assert.equal(resaleEstimate([item,{...item,id:"two"},{...item,id:"sold",status:"SOLD",valueUsdt:100}]),0.2);
});
test("reviews require an actual delivery date, not a tracking number or transit status", () => {
 const valuableItem={...item,valueUsdt:MIN_REVIEW_ITEM_VALUE_USDT};
 assert.equal(canReview({...valuableItem,status:"SHIPPING"},[]),false);
 assert.equal(canReview({...valuableItem,status:"DELIVERED"},[]),false);
 const delivered={...valuableItem,status:"DELIVERED" as const,shipping:{...item.shipping!,deliveredAt:"2026-09-29T00:00:00Z"}};
 assert.equal(canReview(delivered,[]),true);
 assert.equal(canReview({...delivered,valueUsdt:99.99},[]),false);
 assert.equal(canReview(delivered,[{ownedId:item.id}]),false);
 assert.equal(canReview({...delivered,shipping:{...delivered.shipping,deliveredAt:"invalid"}},[]),false);
});
const review = (n: number) => ({ownedId:"own-"+n,boxSlug:"test",itemId:"test",text:"Test review content",rating:4,bonusUsdt:10});
test("saving beyond 20 reviews retains history; duplicates do not produce another record or reward", () => {
 useInventoryStore.setState({items:[...Array.from({length:25},(_,n)=>({...item,id:"own-"+n,valueUsdt:100})),... [100,200].map(n=>({...item,id:"own-"+n,valueUsdt:100})),{...item,id:"own-low",valueUsdt:99.99}]});
 useCommunityStore.setState({mine:[]});
 assert.throws(()=>useCommunityStore.getState().add({...review(0),ownedId:"own-low"}),/ineligible-review-item/);
 for(let n=0;n<25;n++) useCommunityStore.getState().add(review(n));
 assert.equal(useCommunityStore.getState().mine.length,25);
 assert.ok(useCommunityStore.getState().hasReviewed("own-0"));
 assert.throws(()=>useCommunityStore.getState().add(review(0)),/duplicate/);
 assert.ok(useCommunityStore.getState().mine.every(r=>r.bonusUsdt===0));
 const first=useCommunityStore.getState().mine[0];
 useCommunityStore.getState().update(first.id,{text:"Updated content",rating:2,photo:undefined});
 assert.equal(useCommunityStore.getState().mine[0].rating,2);
 assert.equal(useCommunityStore.getState().mine[0].at,first.at);
 useCommunityStore.getState().remove(first.id);
 assert.equal(useCommunityStore.getState().mine.length,24);
});
test("storage failure does not silently overwrite or discard existing reviews", () => {
 const before=useCommunityStore.getState().mine;
 const original=Object.getOwnPropertyDescriptor(globalThis,"window");
 Object.defineProperty(globalThis,"window",{configurable:true,value:{localStorage:{setItem:()=>{throw new Error("quota");}}}});
 try {
   assert.throws(()=>useCommunityStore.getState().add(review(100)),/quota/);
   assert.equal(useCommunityStore.getState().mine,before);
   assert.throws(()=>useCommunityStore.getState().remove(before[0].id),/quota/);
   assert.equal(useCommunityStore.getState().mine,before);
 } finally { if(original) Object.defineProperty(globalThis,"window",original); else Reflect.deleteProperty(globalThis,"window"); }
});
test("invalid ratings and missing edits cannot be reported as saved", () => {
 assert.throws(()=>useCommunityStore.getState().add({...review(200),rating:0}),/invalid/);
 assert.throws(()=>useCommunityStore.getState().update("missing",{text:"Valid content",rating:4}),/not-found/);
});

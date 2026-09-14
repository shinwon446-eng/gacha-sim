// 상품별 이미지 검색 매니페스트.
// cats: Commons 카테고리 직접 지정(가장 정확). 없으면 queries 로 카테고리 검색 → 풀텍스트 → Openverse 순 폴백.
// pick: 특정 파일 강제 지정 ("File:..." 제목 또는 URL). reject: 검수 탈락 파일(재실행 시 건너뜀).

export const MIN_SIDE = 1200; // 가로/세로 최소
export const HARD_MIN_SIDE = 1000; // 이보다 작으면 무조건 Reject
export const MIN_BYTES = 5 * 1024; // HTML 에러 파일 방지
export const PREFER_BYTES = 200 * 1024;
export const ASPECT_MIN = 0.5;
export const ASPECT_MAX = 2.0;

const C = (...names) => names.map((n) => `Category:${n}`);

/** @type {{slug:string, category:string, name:string, queries:string[], cats?:string[], pick?:string, reject?:string[]}[]} */
export const MANIFEST = [
  // ── tech / cybertruck-beast ──
  { slug: "ct-foundation", category: "tech", name: "Cybertruck Foundation Series", queries: ["Tesla Cybertruck"], cats: C("Tesla Cybertruck") },
  { slug: "ct-powerwall", category: "tech", name: "Tesla Powerwall 3", queries: ["Tesla Powerwall"], cats: C("Tesla Powerwall") },
  { slug: "ct-vision", category: "tech", name: "Apple Vision Pro 1TB", queries: ["Apple Vision Pro"], cats: C("Apple Vision Pro") },
  { slug: "ct-iphone", category: "tech", name: "iPhone 16 Pro Max 1TB", queries: ["iPhone 16 Pro Max"], cats: C("IPhone 16 Pro Max", "IPhone 16 Pro") },
  { slug: "ct-deck", category: "tech", name: "Steam Deck OLED 1TB", queries: ["Steam Deck OLED"], cats: C("Steam Deck (OLED)", "Steam Deck") },
  { slug: "ct-airpods", category: "tech", name: "AirPods Pro 2", queries: ["AirPods Pro"], cats: C("AirPods Pro") },
  { slug: "ct-watch", category: "tech", name: "Apple Watch Series 10", queries: ["Apple Watch Series 10", "Apple Watch"] },
  // ── tech / macbook-silicon ──
  { slug: "mb-max", category: "tech", name: "MacBook Pro 16 M4 Max 128GB", queries: ["MacBook Pro 16"], pick: 'File:Apple MacBook Pro 16" M2 Max 3.jpg' },
  { slug: "mb-pro", category: "tech", name: "MacBook Pro 14 M4 Pro", queries: ["MacBook Pro 14-inch"] },
  { slug: "mb-air", category: "tech", name: "MacBook Air 15 M3", queries: ["MacBook Air 15-inch", "MacBook Air M2"] },
  { slug: "mb-ipad", category: "tech", name: "iPad Air M2", queries: ["iPad Air"], cats: C("IPad Air") },
  { slug: "mb-magic", category: "tech", name: "Magic Keyboard + Mouse", queries: ["Apple Magic Keyboard"], cats: C("Apple Magic Keyboard") },
  { slug: "mb-cable", category: "tech", name: "Thunderbolt 4 케이블", queries: ["Thunderbolt 4 cable", "USB-C cable white"] },
  // ── tech / ps5-pro-drop ──
  { slug: "ps-vr2", category: "tech", name: "PlayStation VR2 + PS5 Pro 번들", queries: ["PlayStation VR2"], cats: C("PlayStation VR2") },
  { slug: "ps-pro", category: "tech", name: "PS5 Pro", queries: ["PlayStation 5 Pro"], cats: C("PlayStation 5 Pro", "PlayStation 5") },
  { slug: "ps-vita", category: "tech", name: "PlayStation Vita PCH-1000", queries: ["PlayStation Vita"], pick: "File:PlayStation-Vita-1101-FL.jpg" },
  { slug: "ps-dualsense", category: "tech", name: "DualSense Edge", queries: ["DualSense"], cats: C("DualSense") },
  { slug: "ps-ds4", category: "tech", name: "DualShock 4 컨트롤러", queries: ["DualShock 4"], cats: C("DualShock 4") },
  { slug: "ps-ps4pro", category: "tech", name: "PlayStation 4 Pro 1TB", queries: ["PlayStation 4 Pro"], cats: C("PlayStation 4 Pro") },
  // ── tech / supercar-key ──
  { slug: "sc-gt3", category: "tech", name: "Porsche 911 GT3 (992)", queries: ["Porsche 992 GT3"], cats: C("Porsche 992 GT3") },
  { slug: "sc-model3", category: "tech", name: "Tesla Model 3 Performance", queries: ["Tesla Model 3 2023"], cats: C("Tesla Model 3 (2023–)") },
  { slug: "sc-sim", category: "tech", name: "레이싱 시뮬레이터 풀세트", queries: ["racing simulator cockpit"], cats: C("Racing game seats") },
  { slug: "sc-wheel", category: "tech", name: "Fanatec DD Pro 휠", queries: ["sim racing steering wheel"], cats: C("Racing game steering wheels") },
  { slug: "sc-model", category: "tech", name: "Porsche 911 1:18 다이캐스트 모델", queries: ["Porsche model car"], cats: C("Porsche model cars") },
  { slug: "sc-keychain", category: "tech", name: "슈퍼카 스마트키 세트", queries: ["car key"], pick: "File:Wireless car key.jpg" },
  // ── tcg / pokemon-shadowless ──
  { slug: "pk-charizard10", category: "tcg", name: "Charizard 1st Ed. Shadowless PSA 10", queries: ["Charizard Pokémon card"], cats: C("Pokémon Trading Card Game") },
  { slug: "pk-blastoise9", category: "tcg", name: "Blastoise 1st Ed. Shadowless PSA 9", queries: ["Blastoise Pokemon card","Pokemon card Blastoise"], prefer: "stock" },
  { slug: "pk-venusaur9", category: "tcg", name: "Venusaur 1st Ed. Shadowless PSA 9", queries: ["Venusaur Pokemon card","Pokemon card Venusaur"], prefer: "stock" },
  { slug: "pk-charizard7", category: "tcg", name: "Charizard Base Set Unlimited PSA 7", queries: ["PSA graded Pokemon card","Charizard Pokemon card"], prefer: "stock" },
  { slug: "pk-pikachu8", category: "tcg", name: "Pikachu Base Set PSA 8", queries: ["Pikachu Pokemon card","Pokemon card Pikachu"], prefer: "stock" },
  { slug: "pk-holo", category: "tcg", name: "Base Set 홀로 카드 (랜덤)", queries: ["Pokemon holo card","Pokemon holographic card"], prefer: "stock" },
  { slug: "pk-pack", category: "tcg", name: "151 부스터 팩 1개", queries: ["Pokemon booster pack","Pokemon card pack"], prefer: "stock" },
  // ── tcg / pokemon-151 ──
  { slug: "p151-zard-sar", category: "tcg", name: "Charizard ex SAR PSA 10", queries: ["Charizard ex Pokemon card","Pokemon 151 Charizard"], prefer: "stock" },
  { slug: "p151-box", category: "tcg", name: "151 부스터 박스 (실드)", queries: ["Pokemon booster box","Pokemon card box sealed"], prefer: "stock" },
  { slug: "p151-mew", category: "tcg", name: "Mew ex SIR PSA 9", queries: ["Mew Pokemon card","Pokemon card Mew"], prefer: "stock" },
  { slug: "p151-etb", category: "tcg", name: "151 엘리트 트레이너 박스", queries: ["Pokemon elite trainer box","Pokemon trainer box"], prefer: "stock" },
  { slug: "p151-tin", category: "tcg", name: "151 컬렉션 틴", queries: ["Pokemon card tin","Pokemon tin"], prefer: "stock" },
  { slug: "p151-pack", category: "tcg", name: "151 부스터 팩 1개", queries: ["Pokemon Scarlet Violet booster pack","Pokemon booster pack"], prefer: "stock" },
  // ── tcg / onepiece-op01 ──
  { slug: "op-luffy-manga", category: "tcg", name: "Luffy Manga Rare PSA 10", queries: ["One Piece card game Luffy", "One Piece trading card"], prefer: "stock" },
  { slug: "op-shanks", category: "tcg", name: "Shanks Alt Art PSA 10", queries: ["One Piece card game Shanks", "One Piece card game"], prefer: "stock" },
  { slug: "op-box", category: "tcg", name: "OP-01 부스터 박스 (실드)", queries: ["One Piece card game booster box", "trading card booster box"], prefer: "stock" },
  { slug: "op-zoro", category: "tcg", name: "Zoro Leader Parallel", queries: ["One Piece card game Zoro", "One Piece card game cards"], prefer: "stock" },
  { slug: "op-starter", category: "tcg", name: "스타터 덱", queries: ["One Piece card game starter deck", "trading card game starter deck"], prefer: "stock" },
  { slug: "op-pack", category: "tcg", name: "OP-01 부스터 팩 1개", queries: ["One Piece card game booster pack", "trading card booster pack"], prefer: "stock" },
  // ── luxury / rolex-daytona ──
  { slug: "rx-daytona", category: "luxury", name: "Rolex Daytona 126500LN Panda", queries: ["Rolex Daytona"], cats: C("Rolex Daytona") },
  { slug: "rx-sub", category: "luxury", name: "Rolex Submariner Date", queries: ["Rolex Submariner"], pick: "File:Rolex Oyster Perpetual Date Submariner Watch.JPG" },
  { slug: "rx-omega", category: "luxury", name: "Omega Speedmaster Moonwatch", queries: ["Omega Speedmaster"], cats: C("Omega Speedmaster") },
  { slug: "rx-breitling", category: "luxury", name: "Breitling Navitimer", queries: ["Breitling Navitimer"], cats: C("Breitling Navitimer") },
  { slug: "rx-seiko", category: "luxury", name: "Seiko Prospex Diver", queries: ["Seiko diver watch"] },
  { slug: "rx-strap", category: "luxury", name: "다이버 러버 스트랩 세트", queries: ["watch strap"], pick: "File:Polyurethane watch strap on a diving watch.jpg" },
  { slug: "rx-winder", category: "luxury", name: "워치 박스 케이스", queries: ["watch box"], pick: "File:Orient Capital FUG1R003W9 wrist watch box open.jpg" },
  // ── luxury / birkin-drop ──
  { slug: "hm-birkin", category: "luxury", name: "Hermès Birkin 30 Crocodile", queries: ["Birkin bag"], pick: "File:Croc Birkin bag.jpg" },
  { slug: "hm-kelly", category: "luxury", name: "Hermès Kelly 클러치 Togo", queries: ["Kelly bag"], pick: "File:Hermes-太陽--得意-kelly錢包手包 原廠進口頭層牛皮荔枝紋Togo 顏色齊全 現貨尺寸：20cm*11cm (37983494475).jpg" },
  { slug: "hm-lv", category: "luxury", name: "Louis Vuitton Neverfull MM", queries: ["Louis Vuitton bag"] },
  { slug: "hm-wallet", category: "luxury", name: "Hermès Bearn 지갑", queries: ["Hermès wallet"] },
  { slug: "hm-twilly", category: "luxury", name: "Hermès Twilly 스카프", queries: ["Hermès scarf"], cats: C("Hermès carrés") },
  { slug: "hm-leica", category: "luxury", name: "Leica MP Hermès Edition", queries: ["Leica MP"], pick: "File:Leica MP Hermes.jpg" },
  // ── luxury / sneaker-grail ──
  { slug: "sn-aj1-1", category: "luxury", name: "Air Jordan 1 Retro High OG", queries: ["Air Jordan 1"], cats: C("Air Jordan 1") },
  { slug: "sn-aj1-2", category: "luxury", name: "Air Jordan 1 Low", queries: ["Air Jordan 1"], cats: C("Air Jordan 1") },
  { slug: "sn-am90", category: "luxury", name: "Nike Air Max 90 Infrared", queries: ["Nike Air Max 90"], pick: "File:Nike Air Max 90 Infrared (4805905007).jpg" },
  { slug: "sn-yeezy", category: "luxury", name: "Yeezy 350 V2", queries: ["Yeezy Boost 350 V2"] },
  { slug: "sn-af1", category: "luxury", name: "Nike Air Force 1", queries: ["Nike Air Force 1"], cats: C("Nike Air Force") },
  { slug: "sn-socks", category: "luxury", name: "Nike 삭스 3팩", queries: ["Nike socks white"] },
];

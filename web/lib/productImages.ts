/**
 * 상품 이미지 경로의 단일 원천.
 *
 * 데이터셋(lib/products.ts)에는 URL 을 절대 쓰지 않는다. 상품 id 만 들고 있고
 * 실제 경로는 전부 이 파일이 쥔다. 원격 자산을 로컬 파일로 교체할 때
 * 고칠 파일이 여기 하나뿐이도록 하기 위한 구조다.
 *
 * 교체 절차
 *   1. public/products/<id>.webp 로 파일을 넣는다
 *   2. 아래 SOURCES 의 해당 항목을 { src: "/products/<id>.webp" } 로 바꾼다
 *   3. 끝. 컴포넌트는 손대지 않는다.
 *
 * src 가 null 이면 UI 는 다크 플레이스홀더(코드 플레이트)로 폴백한다.
 * 확보하지 못한 자산에 임의의 URL 을 적어두지 않는다 — 깨진 이미지가
 * 조용히 배포되는 것보다 플레이스홀더가 낫다.
 */

export interface ProductImage {
  /** 원격 URL 또는 /public 기준 절대 경로. 미확보면 null */
  src: string | null;
  /** 원격 자산일 때 출처 표기. 로컬 자산은 생략 */
  credit?: string;
  /** 누끼 컷이면 true — 다크 배경 위에 그대로 얹는다. false 면 object-cover 로 채운다. */
  cutout?: boolean;
}

const NONE: ProductImage = { src: null };

/**
 * 박스 id / 상품 id → 이미지.
 * 비어 있는 키는 NONE 으로 폴백하므로 확보한 것만 등록하면 된다.
 */
const SOURCES: Record<string, ProductImage> = {
  "cybertruck-dream": { src: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "urban-mobility": { src: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "apex-workstation": { src: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "flagship-phone": { src: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "gpu-rig": { src: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "camera-studio": { src: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "reference-audio": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Genelec_8030A_activespeaker.jpg/1920px-Genelec_8030A_activespeaker.jpg", credit: "Genelec 8030A activespeaker.jpg · Tumi-1983 · CC BY-SA 3.0", cutout: false },
  "rolex-vault": { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "swiss-watch": { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "luxury-leather": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Pink_Birkin_bag.jpg/1920px-Pink_Birkin_bag.jpg", credit: "Pink Birkin bag.jpg · Yvette Religioso-Ilagan from Philippines · CC BY 2.0", cutout: false },
  "grail-handbag": { src: "https://upload.wikimedia.org/wikipedia/commons/1/13/Kelly_Bag.jpg", credit: "Kelly Bag.jpg · Wen-Cheng Liu · CC BY-SA 2.0", cutout: false },
  "sneaker-drop": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/2023_Buty_Nike_Air_Jordan.jpg/1920px-2023_Buty_Nike_Air_Jordan.jpg", credit: "2023 Buty Nike Air Jordan.jpg · Jacek Halicki · CC BY-SA 4.0", cutout: false },
  "guaranteed-tech": { src: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80", credit: "Unsplash · Unsplash License", cutout: false },
  "guaranteed-daily": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/%E3%83%80%E3%82%A4%E3%82%BD%E3%83%B3_%2846699109862%29.jpg/1920px-%E3%83%80%E3%82%A4%E3%82%BD%E3%83%B3_%2846699109862%29.jpg", credit: "ダイソン (46699109862).jpg · whity · CC BY 2.0", cutout: false },
  "ctd-cybertruck": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/2024_Tesla_Cybertruck_Foundation_Series_IMG_0634_%28cropped%29.jpg/1920px-2024_Tesla_Cybertruck_Foundation_Series_IMG_0634_%28cropped%29.jpg", credit: "2024 Tesla Cybertruck Foundation Series IMG 0634 (cropped).jpg · Alexander-93 · CC BY-SA 4.0", cutout: false },
  "ctd-model3": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/2024_Tesla_Model_3_Performance_rear_view.png/1920px-2024_Tesla_Model_3_Performance_rear_view.png", credit: "2024 Tesla Model 3 Performance rear view.png · iMoD Official · CC BY 3.0", cutout: true },
  "ctd-visionpro": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/AR-_Apple_Vision_Pro_%282023%29.png/1920px-AR-_Apple_Vision_Pro_%282023%29.png", credit: "AR- Apple Vision Pro (2023).png · Steve Zhang · CC BY-SA 4.0", cutout: true },
  "ctd-segway": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Ninebot_by_Segway_Kickscooter_ES2.jpg/1920px-Ninebot_by_Segway_Kickscooter_ES2.jpg", credit: "Ninebot by Segway Kickscooter ES2.jpg · Vogler · CC BY-SA 4.0", cutout: false },
  "ctd-brompton": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Brompton_T-Line%2C_Velo_24%2C_Berlin_%28VB243545%29.jpg/1920px-Brompton_T-Line%2C_Velo_24%2C_Berlin_%28VB243545%29.jpg", credit: "Brompton T-Line, Velo 24, Berlin (VB243545).jpg · Matti Blume · CC BY-SA 4.0", cutout: false },
  "ctd-dji": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/2024_Dron_DJI_Air_3S_%283%29.jpg/1920px-2024_Dron_DJI_Air_3S_%283%29.jpg", credit: "2024 Dron DJI Air 3S (3).jpg · Jacek Halicki · CC BY-SA 4.0", cutout: false },
  "urb-vanmoof": { src: "https://upload.wikimedia.org/wikipedia/commons/7/7a/VanMoof_S5.png", credit: "VanMoof S5.png · Van Moof B.V. · CC BY-SA 4.0", cutout: true },
  "urb-segway": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Ninebot_by_Segway_Kickscooter_ES2.jpg/1920px-Ninebot_by_Segway_Kickscooter_ES2.jpg", credit: "Ninebot by Segway Kickscooter ES2.jpg · Vogler · CC BY-SA 4.0", cutout: false },
  "urb-brompton": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Brompton_T-Line%2C_Velo_24%2C_Berlin_%28VB243545%29.jpg/1920px-Brompton_T-Line%2C_Velo_24%2C_Berlin_%28VB243545%29.jpg", credit: "Brompton T-Line, Velo 24, Berlin (VB243545).jpg · Matti Blume · CC BY-SA 4.0", cutout: false },
  "apx-mbp": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/MacBook_Pro_16_%28M1_Pro%2C_2021%29_-_Wikipedia.jpg/1920px-MacBook_Pro_16_%28M1_Pro%2C_2021%29_-_Wikipedia.jpg", credit: "MacBook Pro 16 (M1 Pro, 2021) - Wikipedia.jpg · Premeditated · CC BY-SA 4.0", cutout: false },
  "apx-studio": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Apple_Studio_Display_and_Mac_Studio_with_Peripherals.jpg/1920px-Apple_Studio_Display_and_Mac_Studio_with_Peripherals.jpg", credit: "Apple Studio Display and Mac Studio with Peripherals.jpg · AzureSaturn · CC0", cutout: false },
  "apx-xdr": { src: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Apple_Pro_Display_XDR_and_Mac_Pro_%282019_model%29.png", credit: "Apple Pro Display XDR and Mac Pro (2019 model).png · Dienthoaiquangcao13 · CC BY-SA 4.0", cutout: true },
  "flg-fold": { src: "https://upload.wikimedia.org/wikipedia/commons/6/69/Samsung-Galaxy-Z-Fold-5_vnutorny-displej.jpg", credit: "Samsung-Galaxy-Z-Fold-5 vnutorny-displej.jpg · Vosveteit · CC BY 3.0", cutout: false },
  "flg-iphone": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/IPhone_15_pro_max.png/1920px-IPhone_15_pro_max.png", credit: "IPhone 15 pro max.png · Ka Kit Pang · CC BY-SA 4.0", cutout: true },
  "flg-flip": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Samsung_Galaxy_Z_Flip_4.jpg/1920px-Samsung_Galaxy_Z_Flip_4.jpg", credit: "Samsung Galaxy Z Flip 4.jpg · Hajoon0102 · CC BY-SA 4.0", cutout: false },
  "gpu-5090": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/NVIDIA_RTX_4090_Founders_Edition_-_Nahaufnahme_%28ZMASLO%29.png/1920px-NVIDIA_RTX_4090_Founders_Edition_-_Nahaufnahme_%28ZMASLO%29.png", credit: "NVIDIA RTX 4090 Founders Edition - Nahaufnahme (ZMASLO).png · ZMASLO · CC BY 3.0", cutout: true },
  "cam-a1": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Sony_A1_-_front_view_-_by_Henry_S%C3%B6derlund_Freigestellt.png/1920px-Sony_A1_-_front_view_-_by_Henry_S%C3%B6derlund_Freigestellt.png", credit: "Sony A1 - front view - by Henry Söderlund Freigestellt.png · Henry Söderlund · CC BY 2.0", cutout: true },
  "cam-r5": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Canon_EOS_R5.jpg/1920px-Canon_EOS_R5.jpg", credit: "Canon EOS R5.jpg · Harrison Jones · CC BY-SA 4.0", cutout: false },
  "cam-leica": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Leica_Q3_with_Summilix.jpg/1920px-Leica_Q3_with_Summilix.jpg", credit: "Leica Q3 with Summilix.jpg · Burkhard Mücke · CC BY 4.0", cutout: false },
  "aud-genelec": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Genelec_8030A_activespeaker.jpg/1920px-Genelec_8030A_activespeaker.jpg", credit: "Genelec 8030A activespeaker.jpg · Tumi-1983 · CC BY-SA 3.0", cutout: false },
  "rlx-daytona": { src: "https://upload.wikimedia.org/wikipedia/commons/6/64/Detailed_view_on_chronograph_pushers_and_crown_of_a_Rolex_Daytona_%22Black_and_diamonds%22_%28cropped%29.jpg", credit: "Detailed view on chronograph pushers and crown of a Rolex Daytona 'Black and diamonds' (cropped).jpg · Thomas Quine · CC BY 2.0", cutout: false },
  "rlx-sub": { src: "https://upload.wikimedia.org/wikipedia/commons/1/11/Rolex_Submariner_and_GMT_Master_II.jpg", credit: "Rolex Submariner and GMT Master II.jpg · OpaleHorse · CC BY-SA 4.0", cutout: false },
  "rlx-gmt": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Rolex_GMT_Master_II_Pepsi.jpg/1920px-Rolex_GMT_Master_II_Pepsi.jpg", credit: "Rolex GMT Master II Pepsi.jpg · OpaleHorse · CC BY-SA 4.0", cutout: false },
  "rlx-ap": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Audemars_Piguet_Royal_Oak_ref._15202.jpg/1920px-Audemars_Piguet_Royal_Oak_ref._15202.jpg", credit: "Audemars Piguet Royal Oak ref. 15202.jpg · OpaleHorse · CC BY-SA 4.0", cutout: false },
  "sws-omega": { src: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Omega_Seamaster_Aqua_Terra.jpg", credit: "Omega Seamaster Aqua Terra.jpg · EMore98 · CC BY-SA 4.0", cutout: false },
  "sws-tudor": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Tudor_Pelagos_for_Carolina_Watch_Club_on_Wrist.jpg/1920px-Tudor_Pelagos_for_Carolina_Watch_Club_on_Wrist.jpg", credit: "Tudor Pelagos for Carolina Watch Club on Wrist.jpg · OpaleHorse · CC BY-SA 4.0", cutout: false },
  "sws-longines": { src: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Longines_Spirit_Zulu_Time.jpg", credit: "Longines Spirit Zulu Time.jpg · Clyde94 · CC BY-SA 4.0", cutout: false },
  "lth-birkin": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Pink_Birkin_bag.jpg/1920px-Pink_Birkin_bag.jpg", credit: "Pink Birkin bag.jpg · Yvette Religioso-Ilagan from Philippines · CC BY 2.0", cutout: false },
  "lth-kelly": { src: "https://upload.wikimedia.org/wikipedia/commons/1/13/Kelly_Bag.jpg", credit: "Kelly Bag.jpg · Wen-Cheng Liu · CC BY-SA 2.0", cutout: false },
  "lth-chanel": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Chanel_2.55.jpg/1920px-Chanel_2.55.jpg", credit: "Chanel 2.55.jpg · Liu Wen Cheng 我希望成為 · CC BY-SA 2.0", cutout: false },
  "grl-birkin25": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Croc_Birkin_bag.jpg/1920px-Croc_Birkin_bag.jpg", credit: "Croc Birkin bag.jpg · Ohconfucius · CC BY 3.0", cutout: false },
  "grl-kelly25": { src: "https://upload.wikimedia.org/wikipedia/commons/1/13/Kelly_Bag.jpg", credit: "Kelly Bag.jpg · Wen-Cheng Liu · CC BY-SA 2.0", cutout: false },
  "grl-chanel19": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Chanel_2.55.jpg/1920px-Chanel_2.55.jpg", credit: "Chanel 2.55.jpg · Liu Wen Cheng 我希望成為 · CC BY-SA 2.0", cutout: false },
  "snk-dior": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Air_Jordan_1_Retro_High_OG_CO._Japan_silver.jpg/1920px-Air_Jordan_1_Retro_High_OG_CO._Japan_silver.jpg", credit: "Air Jordan 1 Retro High OG CO. Japan silver.jpg · HI 622 · CC BY-SA 4.0", cutout: false },
  "snk-offwhite": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/2023_Nike_SB_Dunk_Low_Pro_%282%29.jpg/1920px-2023_Nike_SB_Dunk_Low_Pro_%282%29.jpg", credit: "2023 Nike SB Dunk Low Pro (2).jpg · Jacek Halicki · CC BY-SA 4.0", cutout: false },
  "snk-travis": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Air_Jordan_1_Low_G.jpg/1920px-Air_Jordan_1_Low_G.jpg", credit: "Air Jordan 1 Low G.jpg · Pangalau · CC BY-SA 4.0", cutout: false },
  "gtc-mbp": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/A_2021_14-inch_Silver_MacBook_Pro_%28cropped%29.jpg/1920px-A_2021_14-inch_Silver_MacBook_Pro_%28cropped%29.jpg", credit: "A 2021 14-inch Silver MacBook Pro (cropped).jpg · Oops4321 · CC BY-SA 4.0", cutout: false },
  "gtc-ipadpro": { src: "https://upload.wikimedia.org/wikipedia/commons/7/70/Apple_iPad_Pro_11.jpg", credit: "Apple iPad Pro 11.jpg · 彭家杰 · CC BY-SA 4.0", cutout: false },
  "gtc-mba": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Macbook_Air.png/1920px-Macbook_Air.png", credit: "Macbook Air.png · 嘉傑 · Public domain", cutout: true },
  "gdy-lamp": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/PH_Lampen.jpg/1920px-PH_Lampen.jpg", credit: "PH Lampen.jpg · Holger Damgaard (1870-1945) · Public domain", cutout: false },
  "gdy-dyson": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/%E3%83%80%E3%82%A4%E3%82%BD%E3%83%B3_%2846699109862%29.jpg/1920px-%E3%83%80%E3%82%A4%E3%82%BD%E3%83%B3_%2846699109862%29.jpg", credit: "ダイソン (46699109862).jpg · whity · CC BY 2.0", cutout: false },
};

export const imageFor = (id: string): ProductImage => SOURCES[id] ?? NONE;

/** 자산 확보율 — 관리 화면과 테스트에서 쓴다. */
export const imageCoverage = (ids: string[]): { have: number; total: number } => ({
  have: ids.filter((id) => SOURCES[id]?.src).length,
  total: ids.length,
});

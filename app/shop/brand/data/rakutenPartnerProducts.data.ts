import type { ShopBrandId } from "../types/brandCatalog.types";

export type RakutenPartnerProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  color: string;
};

export const rakutenPartnerProducts: Partial<
  Record<ShopBrandId, RakutenPartnerProduct[]>
> = {
  bloomingdales: [
    {
      id: "194259448062",
      name: "Dress the Population Nissa Dress",
      price: 134.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/1/optimized/14794571_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Dresses",
      color: "Assorted",
    },
    {
      id: "194259389280",
      name: "Dress the Population Heather Ruched Bodycon Dress",
      price: 198.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/1/optimized/13544711_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Dresses",
      color: "Assorted",
    },
    {
      id: "194259443852",
      name: "Dress the Population Dayton Sequin Long Sleeve Minidress",
      price: 238.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/9/optimized/14359649_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Dresses",
      color: "Assorted",
    },
    {
      id: "194259373470",
      name: "Dress the Population Gabrielle Off-the-Shoulder Gown",
      price: 262.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/0/optimized/15675168_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Gowns",
      color: "Assorted",
    },
    {
      id: "194259438063",
      name: "Dress the Population Maddox Bodycon Dress",
      price: 230.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/8/optimized/14359188_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Dresses",
      color: "Assorted",
    },
    {
      id: "194259053884",
      name: "Dress the Population Monroe Sweetheart Neck Gown",
      price: 198.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/9/optimized/13882849_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Gowns",
      color: "Assorted",
    },
    {
      id: "194259295697",
      name: "Dress the Population Kai Strapless Gown",
      price: 158.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/8/optimized/15675668_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Gowns",
      color: "Assorted",
    },
    {
      id: "194259316408",
      name: "Dress the Population Bailey Off-the-Shoulder Sheath Dress",
      price: 142.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/0/optimized/14274756_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Dresses",
      color: "Assorted",
    },
    {
      id: "194259029827",
      name: "Dress the Population Emery Sequined Scoop Back Dress",
      price: 230.4,
      image:
        "https://images.bloomingdalesassets.com/is/image/BLM/products/6/optimized/14359646_fpx.tif?wid=800&qlt=100,0&layer=comp&op_sharpen=0&resMode=bilin&op_usm=0.7,1.0,0.5,0&fmt=jpeg&4msn=.jpg",
      category: "Dresses",
      color: "Assorted",
    },
  ],
  "ymi-jeans": [
    {
      id: "46180902011138",
      name: "Women's Luxe Mid Rise WannaBettaButt Bootcut Jeans",
      price: 60,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/P808856-W37_1.jpg?v=1764364963",
      category: "Jeans",
      color: "Indigo",
    },
    {
      id: "46662000607490",
      name: "Women's Luxe Taylor Flare Jeans",
      price: 64,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/P084060-08Q.jpg?v=1760738747",
      category: "Jeans",
      color: "Light blue",
    },
    {
      id: "46030950301954",
      name: "Pull On Jogger Short",
      price: 20,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/S314007-KHA-6.jpg?v=1750894271",
      category: "Shorts",
      color: "Camel",
    },
    {
      id: "45914696352002",
      name: "Women's Plus Curvy Fit Ultra Cuffed Shorts",
      price: 10,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/ES253196-L2651-5.jpg?v=1762458709",
      category: "Shorts",
      color: "Indigo",
    },
    {
      id: "46611123208450",
      name: "Women's Plus High Rise Hyperstretch Cropped Straight Pants",
      price: 39,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/EP041231-DKBER_11_f9a6654e-bba4-4880-a921-9789b9fdd4ea.jpg?v=1759354337",
      category: "Pants",
      color: "Berry",
    },
    {
      id: "46664735654146",
      name: "Women's Hyperstretch Cropped Straight Pants",
      price: 39,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/P041231-INDI_1.jpg?v=1761175232",
      category: "Pants",
      color: "Indigo",
    },
    {
      id: "45914588119298",
      name: "Women's Essential 2-Button Roll Cuff Ankle Jeans",
      price: 30,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/products/WP938140_M1863_1.jpg?v=1741027083",
      category: "Jeans",
      color: "Light blue",
    },
    {
      id: "45938407833858",
      name: "Women's Plus WannaBettaButt Mid Rise Embroidered Skinny Jean",
      price: 45,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/EP011675-200CT-6.jpg?v=1757510760",
      category: "Jeans",
      color: "Indigo",
    },
    {
      id: "45916986540290",
      name: "Women's High Rise Belted Cargo Shorts",
      price: 27,
      image:
        "https://cdn.shopify.com/s/files/1/0640/9443/7634/files/S263189-ECRU-1.jpg?v=1762458661",
      category: "Shorts",
      color: "Ivory",
    },
  ],
  "shop-simon": [
    {
      id: "e5ec95aa-860f-4a0e-86d3-6e38f66cbd7e",
      name: "Bloom Sweetheart Gown In Coral",
      price: 238,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/bfc716f297ab47b695f0649bb2e0b14d.jpg?v=1785804314",
      category: "Gowns",
      color: "Coral",
    },
    {
      id: "861bfc98-bac7-4066-8083-3ca950571d63",
      name: "Azalea Mosaic Belted Skirt In Beige",
      price: 45,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/2ee9ec4a6a8e4962ad516cb3cf638b7d.jpg?v=1777666912",
      category: "Skirts",
      color: "Camel",
    },
    {
      id: "d81ff2c1-1b26-4a4b-b290-9c2df7e70504",
      name: "Catalina Midi Dress In Midnight Blue",
      price: 89,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/adb080bb0d9f497584bd72f016b95174.jpg?v=1766015031",
      category: "Dresses",
      color: "Cobalt",
    },
    {
      id: "022d1852-5ed7-4a44-aaa0-a83feb53a5e9",
      name: "Ruched Rosette Asymmetric Evening Dress In Royal",
      price: 238,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/86f6cbc8553c422cbe1696d67192582f.jpg?v=1785821262",
      category: "Dresses",
      color: "Cobalt",
    },
    {
      id: "d27293f0-59d5-45a7-bd40-b6c33af5568b",
      name: "Ruffle Detail Embellished Waist Prom Dress In Teal",
      price: 238,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/2b561ba89a5a4c28beb4d48904f07fb9.jpg?v=1785803838",
      category: "Dresses",
      color: "Teal",
    },
    {
      id: "cca0bdaa-b15c-4c17-86e0-b91aa88b1e1a",
      name: "Serenity Drape Strapless Gown In Pool",
      price: 190,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/d70896a1d44e45f8a6a9399173b94274.jpg?v=1785816225",
      category: "Gowns",
      color: "Ice blue",
    },
    {
      id: "f46d0ccf-f25d-48b4-a149-a180c17895b1",
      name: "V-Neck Linen Jumpsuit In White",
      price: 50,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/cb4b5bf4214541e7be9fd4083773a0a4.jpg?v=1779374994",
      category: "Jumpsuits",
      color: "White",
    },
    {
      id: "08f2d88e-e16c-41d0-8356-80c8fc593a4a",
      name: "Halter Romper In Isla",
      price: 57,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/c08182b821fc4965aa5753958af07438.jpg?v=1784154124",
      category: "Jumpsuits",
      color: "Assorted",
    },
    {
      id: "23865483-b041-4d0e-81f4-c3a4ddcceae9",
      name: "Paradise Print Skirt In Black / Banana",
      price: 54,
      image:
        "https://cdn.shopify.com/s/files/1/0291/4536/6588/files/ed70ee24b67549eba361558293a5170e.jpg?v=1778015659",
      category: "Skirts",
      color: "Black",
    },
  ],
  "davids-bridal": [
    {
      id: "V02266479",
      name: "DB Studio Sequin Lace Sheath Dress With Spaghetti Straps",
      price: 239.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3HNYsRJtu33Ru3V9BbPC1qwYCC4/Set-SDWG1290-11877468-Soft%20White_Champagne.jpg",
      category: "Dresses",
      color: "Ivory",
    },
    {
      id: "V02153891",
      name: "DB Studio Off-the-Shoulder Mesh Tall Bridesmaid Dress",
      price: 149.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FVyt7JbuHzXZWZxnjgVCQcehjX/Set-4XLF19951-11425087-Royal%20Blue.jpg",
      category: "Bridesmaid Dresses",
      color: "Cobalt",
    },
    {
      id: "V02262347",
      name: "DB Studio Chiffon Pleated Bodice A-Line Dress",
      price: 149.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FVmVez5QdpgtNrqflRRevz7YNy/Set-4XLF21081-11871791-Black.jpg",
      category: "Bridesmaid Dresses",
      color: "Black",
    },
    {
      id: "V01982830",
      name: "DB Studio Tall Chiffon One-Shoulder Cutout Dress",
      price: 99.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FVHJh62zNdaVGECxjzCbHH43gw/Set-4XLF20458-11533129-Cinnamon.jpg",
      category: "Bridesmaid Dresses",
      color: "Camel",
    },
    {
      id: "V01954674",
      name: "Galina Signature Charmeuse Flutter-Sleeve A-Line Dress",
      price: 199.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FVhxiWgvWRI1lIwGDXRQIDQ0Ur/Set-GS290034-11470804-Cinnamon.jpg",
      category: "Bridesmaid Dresses",
      color: "Camel",
    },
    {
      id: "V01982579",
      name: "DB Studio Tall Chiffon One-Shoulder Cutout Dress",
      price: 99.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FVHMnAzntQlmhv8USYgGTCcLU4/Set-4XLF20458-11533129-Juniper.jpg",
      category: "Bridesmaid Dresses",
      color: "Green",
    },
    {
      id: "V02266675",
      name: "Vera Wang Bride Satin Tank Ball Gown With Skirt Pickups",
      price: 4999,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FTWE1YBM79lSqaElxnjMtH4axT/Set-8VW352008-11875841-Soft%20White.jpg",
      category: "Wedding Dresses",
      color: "Ivory",
    },
    {
      id: "V02249902",
      name: "DB Studio Matte Satin Bow Shoulder A-Line Dress",
      price: 149.95,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FVeb3fuA0vwOFOqk86hLwbqjLz/Set-F21012-11862436-Dusty%20Blue.jpg",
      category: "Bridesmaid Dresses",
      color: "Ice blue",
    },
    {
      id: "V01944359",
      name: "Lace and Tulle Long Sleeve Ball Gown Wedding Dress",
      price: 1999,
      image:
        "https://cdn.sanity.io/media-libraries/mlskMLq2FOoI/images/containers/3FpQqX8p9ELLMcdthHhQhAWjbTj/Set-SLWG3861-11413345-Solid%20White.jpg",
      category: "Wedding Dresses",
      color: "White",
    },
  ],
  "mens-wearhouse": [
    {
      id: "TMW3BEX38316",
      name: "Egara Skinny Fit Notch Lapel Men's Suit Jacket",
      price: 209.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_3BHD_16_EGARA_SUIT_JACKETS_LIGHT_GREY_MAIN?wid=600&hei=600&qlt=80",
      category: "Suit Jackets",
      color: "Grey",
    },
    {
      id: "TMW6CB950602",
      name: "Awearness Kenneth Cole CHILLFLEX Performance Crewneck Tee",
      price: 29.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_6CB8_02_AWEARNESS_KENNETH_COLE_T_SHIRTS_JET_BLACK_MAIN?wid=600&hei=600&qlt=80",
      category: "Tops",
      color: "Black",
    },
    {
      id: "TMW3BJH44T95",
      name: "Awearness Kenneth Cole Modern Fit Check Suit Pants",
      price: 160,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_3BJG_95_AWEARNESS_KENNETH_COLE_SUIT_PANTS_LIGHT_GREY_GRID_MAIN?wid=600&hei=600&qlt=80",
      category: "Pants",
      color: "Grey",
    },
    {
      id: "TMW430Y10402",
      name: "Nunn Bush Stark Leather Plain Toe Oxfords",
      price: 99.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_430Y_02_NUNN_BUSH_DRESS_SHOES_BLACK_MAIN?wid=600&hei=600&qlt=80",
      category: "Footwear",
      color: "Black",
    },
    {
      id: "TMW3ABB40202",
      name: "Egara Classic Fit Men's Suit Jacket",
      price: 209.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_3ABB_02_EGARA_SUIT_JACKETS_BLACK_SOLID_MAIN?wid=600&hei=600&qlt=80",
      category: "Suit Jackets",
      color: "Black",
    },
    {
      id: "TMW23LC36424",
      name: "PGA TOUR Performance Stretch Golf Shorts",
      price: 68,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_23LC_24_PGA_TOUR_SHORTS_QUIET_SHADE_MAIN?wid=600&hei=600&qlt=80",
      category: "Shorts",
      color: "Grey",
    },
    {
      id: "TMW16U950301",
      name: "Joseph Abboud Premium Wool Blend Blazer",
      price: 279.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_16U8_01_JOSEPH_ABBOUD_BLAZERS_NAVY_MAIN?wid=600&hei=600&qlt=80",
      category: "Blazers",
      color: "Navy",
    },
    {
      id: "TMW3B8H36140",
      name: "Calvin Klein Slim Fit Men's Suit Jacket",
      price: 349.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_3B8H_40_CALVIN_KLEIN_SUIT_JACKETS_TEAL_NEAT_MAIN?wid=600&hei=600&qlt=80",
      category: "Suit Jackets",
      color: "Teal",
    },
    {
      id: "TMW20KB46227",
      name: "Joseph Abboud Comfort Stretch 5-Pocket Pants",
      price: 79.99,
      image:
        "https://image.menswearhouse.com/is/image/TMW/TMW_20BK_27_JOSEPH_ABBOUD_CASUAL_PANTS_NAVY_MAIN?wid=600&hei=600&qlt=80",
      category: "Pants",
      color: "Navy",
    },
  ],
  patbo: [
    {
      id: "41879077027875",
      name: "Feathers Top",
      price: 395,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/SAL32929_TOP32930_24591.jpg",
      category: "Tops",
      color: "Assorted",
    },
    {
      id: "42389918384163",
      name: "Meadow Linen Shorts",
      price: 395,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/SHO34351_TOP34340_2.jpg",
      category: "Shorts",
      color: "Assorted",
    },
    {
      id: "41879080206371",
      name: "Gal Embroidery Short",
      price: 525,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/CAM33395_SHO33396_3.jpg",
      category: "Shorts",
      color: "Assorted",
    },
    {
      id: "40815086338083",
      name: "Joy Lace Fringe Top",
      price: 350,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/SAL32453_TOP32452.jpg",
      category: "Tops",
      color: "Assorted",
    },
    {
      id: "40897567752227",
      name: "Twist Feather Gown",
      price: 2800,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/3_84cf3e49-4ed1-4911-964b-45d0bd859a2f.jpg",
      category: "Gowns",
      color: "Assorted",
    },
    {
      id: "42390723231779",
      name: "Jersey 1958 Bikini Bottom",
      price: 255,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/TOB34787_CAB34788_2.jpg",
      category: "Swimwear",
      color: "Assorted",
    },
    {
      id: "41029231771683",
      name: "Leila Sandal",
      price: 695,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/SND33856_1_MARROM.jpg",
      category: "Footwear",
      color: "Brown",
    },
    {
      id: "40523011981347",
      name: "Nuvok Handbag",
      price: 198,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/Untitleddesign_25.png",
      category: "Bags",
      color: "Assorted",
    },
    {
      id: "40694575136803",
      name: "Artichoke High Waist Bikini Bottom",
      price: 225,
      image:
        "https://cdn.shopify.com/s/files/1/2172/3321/files/14_870c4700-3482-49f4-ad04-8a056c61eeef.jpg",
      category: "Swimwear",
      color: "Assorted",
    },
  ],
};

import diapers from "@/assets/p-diapers.jpg";
import clothes from "@/assets/p-clothes.jpg";
import toys from "@/assets/p-toys.jpg";
import stroller from "@/assets/p-stroller.jpg";
import bottles from "@/assets/p-bottles.jpg";
import shoes from "@/assets/p-shoes.jpg";

export type CategoryId =
  | "fraldas"
  | "roupas"
  | "calcados"
  | "brinquedos"
  | "mamadeiras"
  | "carrinhos"
  | "escolar"
  | "promocoes"
  | "tudo";

export interface Category {
  id: CategoryId;
  label: string;
  icon: string; // lucide icon name
}

export const CATEGORIES: Category[] = [
  { id: "tudo", label: "Tudo", icon: "Sparkles" },
  { id: "fraldas", label: "Fraldas", icon: "Baby" },
  { id: "roupas", label: "Roupas", icon: "Shirt" },
  { id: "calcados", label: "Calçados", icon: "Footprints" },
  { id: "brinquedos", label: "Brinquedos", icon: "ToyBrick" },
  { id: "mamadeiras", label: "Mamadeiras", icon: "Milk" },
  { id: "carrinhos", label: "Carrinhos", icon: "Truck" },
  { id: "escolar", label: "Material Escolar", icon: "Pencil" },
  { id: "promocoes", label: "Promoções", icon: "Flame" },
];

export interface Product {
  id: string;
  title: string;
  image: string;
  price: number;
  oldPrice: number;
  marketplace: string;
  brand: string;
  category: CategoryId;
  coupon?: string;
  vipOnly?: boolean;
  hot?: boolean;
  description: string;
}

const brl = (n: number) => n;

export const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "Fralda Premium Toque Macio — Pacote Mega",
    image: diapers,
    price: brl(54.9),
    oldPrice: brl(109.9),
    marketplace: "Amazon",
    brand: "BabyDry",
    category: "fraldas",
    coupon: "MAMAE50",
    hot: true,
    description:
      "Pacote mega com proteção de 12 horas e toque ultra macio. Achadinho que some rápido!",
  },
  {
    id: "2",
    title: "Kit Body Algodão Orgânico (5 peças)",
    image: clothes,
    price: brl(79.9),
    oldPrice: brl(149.9),
    marketplace: "Shopee",
    brand: "Tiny Co.",
    category: "roupas",
    coupon: "BODY30",
    description:
      "Conjunto de bodies em algodão pima, super respirável e durável. Tons neutros lindos.",
  },
  {
    id: "3",
    title: "Brinquedos de Madeira Montessori",
    image: toys,
    price: brl(89.9),
    oldPrice: brl(189.9),
    marketplace: "Mercado Livre",
    brand: "WoodPlay",
    category: "brinquedos",
    hot: true,
    description:
      "Set educativo que estimula coordenação e criatividade. Material sustentável e seguro.",
  },
  {
    id: "4",
    title: "Carrinho 3 em 1 Compacto Dobrável",
    image: stroller,
    price: brl(799.0),
    oldPrice: brl(1499.0),
    marketplace: "Magalu",
    brand: "RollBaby",
    category: "carrinhos",
    coupon: "ROLL200",
    vipOnly: true,
    description:
      "Dobra com uma mão, super leve e com reclínio total. Oferta limitada do Clube.",
  },
  {
    id: "5",
    title: "Kit Mamadeiras Anticólica (4 un.)",
    image: bottles,
    price: brl(119.9),
    oldPrice: brl(219.9),
    marketplace: "Amazon",
    brand: "SoftFeed",
    category: "mamadeiras",
    description:
      "Sistema anticólica avançado, bicos ultra suaves que imitam a amamentação.",
  },
  {
    id: "6",
    title: "Tênis Primeiros Passos Antiderrapante",
    image: shoes,
    price: brl(64.9),
    oldPrice: brl(129.9),
    marketplace: "Shopee",
    brand: "StepUp",
    category: "calcados",
    coupon: "STEP20",
    hot: true,
    description:
      "Sola flexível e antiderrapante, perfeito para os primeiros passinhos.",
  },
  {
    id: "7",
    title: "Fralda Noturna Extra Absorção",
    image: diapers,
    price: brl(62.9),
    oldPrice: brl(118.0),
    marketplace: "Mercado Livre",
    brand: "BabyDry",
    category: "fraldas",
    description: "Noites secas e tranquilas com absorção reforçada por 12h.",
  },
  {
    id: "8",
    title: "Macacão Plush Inverno Aconchego",
    image: clothes,
    price: brl(94.9),
    oldPrice: brl(179.9),
    marketplace: "Magalu",
    brand: "Tiny Co.",
    category: "roupas",
    coupon: "PLUSH40",
    vipOnly: true,
    description: "Quentinho, macio e estiloso. Edição limitada do Clube VIP.",
  },
  {
    id: "9",
    title: "Cubo de Atividades Sensorial",
    image: toys,
    price: brl(72.9),
    oldPrice: brl(139.9),
    marketplace: "Amazon",
    brand: "WoodPlay",
    category: "brinquedos",
    description: "Várias texturas e cores para estimular os sentidos do bebê.",
  },
  {
    id: "10",
    title: "Copo de Transição com Alça",
    image: bottles,
    price: brl(39.9),
    oldPrice: brl(79.9),
    marketplace: "Shopee",
    brand: "SoftFeed",
    category: "mamadeiras",
    coupon: "COPO15",
    hot: true,
    description: "Antivazamento e fácil de segurar. A transição perfeita.",
  },
  {
    id: "11",
    title: "Sapatinho Couro Ecológico",
    image: shoes,
    price: brl(49.9),
    oldPrice: brl(99.9),
    marketplace: "Mercado Livre",
    brand: "StepUp",
    category: "calcados",
    description: "Confortável e respirável, com acabamento premium.",
  },
  {
    id: "12",
    title: "Mochila Escolar Térmica Infantil",
    image: clothes,
    price: brl(84.9),
    oldPrice: brl(159.9),
    marketplace: "Magalu",
    brand: "SchoolDay",
    category: "escolar",
    coupon: "ESCOLA25",
    description: "Compartimento térmico e design fofo. De volta às aulas!",
  },
];

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function savingsPercent(p: Product): number {
  return Math.round((1 - p.price / p.oldPrice) * 100);
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

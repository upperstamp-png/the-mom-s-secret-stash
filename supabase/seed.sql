-- Seed initial data for "Clube Secreto de Achadinhos para Mamães"

-- Seed Categories
insert into public.categories (id, label, icon) values
('fraldas', 'Fraldas', 'Baby'),
('roupas', 'Roupas', 'Shirt'),
('calcados', 'Calçados', 'Footprints'),
('brinquedos', 'Brinquedos', 'ToyBrick'),
('mamadeiras', 'Mamadeiras', 'Milk'),
('carrinhos', 'Carrinhos', 'Truck'),
('escolar', 'Material Escolar', 'Pencil'),
('promocoes', 'Promoções', 'Flame')
on conflict (id) do update set
    label = excluded.label,
    icon = excluded.icon;

-- Seed Coupons
insert into public.coupons (id, code, discount_value, description, expiration_date) values
('a0000000-0000-0000-0000-000000000001', 'MAMAE50', '50%', 'R$ 50,00 de desconto no pacote Mega', now() + interval '30 days'),
('a0000000-0000-0000-0000-000000000002', 'BODY30', '30%', '30% de desconto no kit de bodies', now() + interval '30 days'),
('a0000000-0000-0000-0000-000000000003', 'ROLL200', 'R$ 200', 'R$ 200,00 de desconto no carrinho dobrável', now() + interval '15 days'),
('a0000000-0000-0000-0000-000000000004', 'STEP20', '20%', '20% off em tênis primeiros passos', now() + interval '45 days'),
('a0000000-0000-0000-0000-000000000005', 'PLUSH40', '40%', '40% off no macacão de inverno plush', now() + interval '10 days'),
('a0000000-0000-0000-0000-000000000006', 'COPO15', '15%', '15% de desconto no copo de transição', now() + interval '60 days'),
('a0000000-0000-0000-0000-000000000007', 'ESCOLA25', '25%', '25% de desconto na mochila escolar térmica', now() + interval '30 days')
on conflict (code) do update set
    discount_value = excluded.discount_value,
    description = excluded.description;

-- Seed Products
insert into public.products (
    id, title, description, image_url, price, old_price, marketplace, category_id, brand, coupon_id, vip_only, hot, slug, affiliate_link
) values
(
    'f0000000-0000-0000-0000-000000000001',
    'Fralda Premium Toque Macio — Pacote Mega',
    'Pacote mega com proteção de 12 horas e toque ultra macio. Achadinho que some rápido!',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop',
    54.90, 109.90, 'Amazon', 'fraldas', 'BabyDry', 'a0000000-0000-0000-0000-000000000001', false, true,
    'fralda-premium-toque-macio-pacote-mega', 'https://amazon.com.br'
),
(
    'f0000000-0000-0000-0000-000000000002',
    'Kit Body Algodão Orgânico (5 peças)',
    'Conjunto de bodies em algodão pima, super respirável e durável. Tons neutros lindos.',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop',
    79.90, 149.90, 'Shopee', 'roupas', 'Tiny Co.', 'a0000000-0000-0000-0000-000000000002', false, false,
    'kit-body-algodao-organico-5-pecas', 'https://shopee.com.br'
),
(
    'f0000000-0000-0000-0000-000000000003',
    'Brinquedos de Madeira Montessori',
    'Set educativo que estimula coordenação e criatividade. Material sustentável e seguro.',
    'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=500&auto=format&fit=crop',
    89.90, 189.90, 'Mercado Livre', 'brinquedos', 'WoodPlay', null, false, true,
    'brinquedos-de-madeira-montessori', 'https://mercadolivre.com.br'
),
(
    'f0000000-0000-0000-0000-000000000004',
    'Carrinho 3 em 1 Compacto Dobrável',
    'Dobra com uma mão, super leve e com reclínio total. Oferta limitada do Clube.',
    'https://images.unsplash.com/photo-1591938424202-7c37b755f718?w=500&auto=format&fit=crop',
    799.00, 1499.00, 'Magalu', 'carrinhos', 'RollBaby', 'a0000000-0000-0000-0000-000000000003', true, false,
    'carrinho-3-em-1-compacto-dobravel', 'https://magazineluiza.com.br'
),
(
    'f0000000-0000-0000-0000-000000000005',
    'Kit Mamadeiras Anticólica (4 un.)',
    'Sistema anticólica avançado, bicos ultra suaves que imitam a amamentação.',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop',
    119.90, 219.90, 'Amazon', 'mamadeiras', 'SoftFeed', null, false, false,
    'kit-mamadeiras-anticolica-4-un', 'https://amazon.com.br'
),
(
    'f0000000-0000-0000-0000-000000000006',
    'Tênis Primeiros Passos Antiderrapante',
    'Sola flexível e antiderrapante, perfeito para os primeiros passinhos.',
    'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=500&auto=format&fit=crop',
    64.90, 129.90, 'Shopee', 'calcados', 'StepUp', 'a0000000-0000-0000-0000-000000000004', false, true,
    'tenis-primeiros-passos-antiderrapante', 'https://shopee.com.br'
),
(
    'f0000000-0000-0000-0000-000000000007',
    'Fralda Noturna Extra Absorção',
    'Noites secas e tranquilas com absorção reforçada por 12h.',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop',
    62.90, 118.00, 'Mercado Livre', 'fraldas', 'BabyDry', null, false, false,
    'fralda-noturna-extra-absorcao', 'https://mercadolivre.com.br'
),
(
    'f0000000-0000-0000-0000-000000000008',
    'Macacão Plush Inverno Aconchego',
    'Quentinho, macio e estiloso. Edição limitada do Clube VIP.',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop',
    94.90, 179.90, 'Magalu', 'roupas', 'Tiny Co.', 'a0000000-0000-0000-0000-000000000005', true, false,
    'macacao-plush-inverno-aconchego', 'https://magazineluiza.com.br'
),
(
    'f0000000-0000-0000-0000-000000000009',
    'Cubo de Atividades Sensorial',
    'Várias texturas e cores para estimular os sentidos do bebê.',
    'https://images.unsplash.com/photo-1515488042361-404e9250afef?w=500&auto=format&fit=crop',
    72.90, 139.90, 'Amazon', 'brinquedos', 'WoodPlay', null, false, false,
    'cubo-de-atividades-sensorial', 'https://amazon.com.br'
),
(
    'f0000000-0000-0000-0000-000000000010',
    'Copo de Transição com Alça',
    'Antivazamento e fácil de segurar. A transição perfeita.',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop',
    39.90, 79.90, 'Shopee', 'mamadeiras', 'SoftFeed', 'a0000000-0000-0000-0000-000000000006', false, true,
    'copo-de-transicao-com-alca', 'https://shopee.com.br'
),
(
    'f0000000-0000-0000-0000-000000000011',
    'Sapatinho Couro Ecológico',
    'Confortável e respirável, com acabamento premium.',
    'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=500&auto=format&fit=crop',
    49.90, 99.90, 'Mercado Livre', 'calcados', 'StepUp', null, false, false,
    'sapatinho-couro-ecologico', 'https://mercadolivre.com.br'
),
(
    'f0000000-0000-0000-0000-000000000012',
    'Mochila Escolar Térmica Infantil',
    'Compartimento térmico e design fofo. De volta às aulas!',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop',
    84.90, 159.90, 'Magalu', 'escolar', 'SchoolDay', 'a0000000-0000-0000-0000-000000000007', false, false,
    'mochila-escolar-termica-infantil', 'https://magazineluiza.com.br'
)
on conflict (slug) do update set
    title = excluded.title,
    description = excluded.description,
    image_url = excluded.image_url,
    price = excluded.price,
    old_price = excluded.old_price,
    marketplace = excluded.marketplace,
    category_id = excluded.category_id,
    brand = excluded.brand,
    coupon_id = excluded.coupon_id,
    vip_only = excluded.vip_only,
    hot = excluded.hot,
    affiliate_link = excluded.affiliate_link;

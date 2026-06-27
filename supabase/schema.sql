-- Database Schema for "Clube Secreto de Achadinhos para Mamães"
-- Compatible with Supabase PostgreSQL

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users / Profiles table (extends auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text,
    email text unique,
    avatar_url text,
    city text,
    state text,
    vip boolean default false not null,
    onboarded boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view all profiles" on public.profiles
    for select using (true);

create policy "Users can update their own profile" on public.profiles
    for update using (auth.uid() = id);

-- 2. Children table
create table public.children (
    id uuid default uuid_generate_v4() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    age_months integer not null check (age_months >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.children enable row level security;

create policy "Users can view their own children" on public.children
    for select using (auth.uid() = profile_id);

create policy "Users can insert their own children" on public.children
    for insert with check (auth.uid() = profile_id);

create policy "Users can update their own children" on public.children
    for update using (auth.uid() = profile_id);

create policy "Users can delete their own children" on public.children
    for delete using (auth.uid() = profile_id);

-- 3. Categories table
create table public.categories (
    id text primary key, -- 'fraldas', 'roupas', 'calcados', etc.
    label text not null,
    icon text not null, -- Lucide icon name
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.categories enable row level security;

create policy "Allow read access to categories for all users" on public.categories
    for select using (true);

-- 4. Interests table (N-N relationship between profiles and categories)
create table public.interests (
    profile_id uuid references public.profiles(id) on delete cascade not null,
    category_id text references public.categories(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (profile_id, category_id)
);

alter table public.interests enable row level security;

create policy "Users can view their own interests" on public.interests
    for select using (auth.uid() = profile_id);

create policy "Users can insert their own interests" on public.interests
    for insert with check (auth.uid() = profile_id);

create policy "Users can delete their own interests" on public.interests
    for delete using (auth.uid() = profile_id);

-- 5. Coupons table
create table public.coupons (
    id uuid default uuid_generate_v4() primary key,
    code text unique not null,
    discount_value text,
    description text,
    expiration_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.coupons enable row level security;

create policy "Allow read access to coupons for all users" on public.coupons
    for select using (true);

-- 6. Products table
create table public.products (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    image_url text not null,
    video_url text,
    price numeric(10, 2) not null check (price >= 0),
    old_price numeric(10, 2) not null check (old_price >= price),
    marketplace text not null, -- 'Amazon', 'Shopee', etc.
    category_id text references public.categories(id) on delete set null,
    brand text,
    coupon_id uuid references public.coupons(id) on delete set null,
    cashback numeric(5, 2) default 0.00,
    affiliate_link text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    score_ai numeric(3, 2) default 5.00, -- AI recommendation score
    popularity numeric(10, 2) default 0.00, -- score based on views/clicks
    conversion_rate numeric(5, 2) default 0.00,
    available boolean default true not null,
    slug text unique not null,
    seo_title text,
    seo_description text,
    vip_only boolean default false not null,
    hot boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

create policy "Allow read access to products for all users" on public.products
    for select using (true);

-- 7. Offers table (specific time-limited deals or campaigns)
create table public.offers (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    title text not null,
    discount_percent integer,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.offers enable row level security;

create policy "Allow read access to offers for all users" on public.offers
    for select using (true);

-- 8. AffiliateLinks table (for tracking and mapping redirects)
create table public.affiliate_links (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    destination_url text not null,
    param_tag text,
    clicks_count integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.affiliate_links enable row level security;

create policy "Allow read access to affiliate links" on public.affiliate_links
    for select using (true);

-- 9. Favorites table
create table public.favorites (
    profile_id uuid references public.profiles(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (profile_id, product_id)
);

alter table public.favorites enable row level security;

create policy "Users can view their own favorites" on public.favorites
    for select using (auth.uid() = profile_id);

create policy "Users can insert their own favorites" on public.favorites
    for insert with check (auth.uid() = profile_id);

create policy "Users can delete their own favorites" on public.favorites
    for delete using (auth.uid() = profile_id);

-- 10. RecentlyViewed table
create table public.recently_viewed (
    profile_id uuid references public.profiles(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    viewed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (profile_id, product_id)
);

alter table public.recently_viewed enable row level security;

create policy "Users can view their own recently viewed products" on public.recently_viewed
    for select using (auth.uid() = profile_id);

create policy "Users can insert/update their own recently viewed" on public.recently_viewed
    for insert with check (auth.uid() = profile_id);

create policy "Users can delete their own history" on public.recently_viewed
    for delete using (auth.uid() = profile_id);

-- 11. PushTokens table
create table public.push_tokens (
    profile_id uuid references public.profiles(id) on delete cascade not null,
    token text not null,
    platform text not null, -- 'web', 'ios', 'android'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (profile_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users can manage their own push tokens" on public.push_tokens
    for all using (auth.uid() = profile_id);

-- 12. Notifications table (Push history & scheduler)
create table public.notifications (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    body text not null,
    target_segment jsonb, -- e.g., {"age_months_min": 12, "age_months_max": 24}
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    status text default 'pending' not null, -- 'pending', 'sent', 'failed'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can read sent notifications" on public.notifications
    for select using (sent_at is not null);

-- 13. Payments table
create table public.payments (
    id uuid default uuid_generate_v4() primary key,
    profile_id uuid references public.profiles(id) on delete set null,
    amount numeric(10, 2) not null,
    payment_method text not null, -- 'stripe', 'mercadopago'
    status text not null, -- 'pending', 'paid', 'failed', 'refunded'
    external_transaction_id text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;

create policy "Users can view their own payments" on public.payments
    for select using (auth.uid() = profile_id);

-- 14. Orders table (VIP Subscriptions / Purchases)
create table public.orders (
    id uuid default uuid_generate_v4() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    payment_id uuid references public.payments(id) on delete set null,
    status text not null, -- 'active', 'cancelled', 'expired'
    total numeric(10, 2) not null,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Users can view their own orders" on public.orders
    for select using (auth.uid() = profile_id);

-- 15. VipMembers table (Active subscriptions)
create table public.vip_members (
    profile_id uuid references public.profiles(id) on delete cascade primary key,
    order_id uuid references public.orders(id) on delete set null,
    status text not null default 'active', -- 'active', 'expired'
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone not null,
    whatsapp_group_joined boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vip_members enable row level security;

create policy "Users can view their own VIP status" on public.vip_members
    for select using (auth.uid() = profile_id);

-- 16. Analytics & Events table
create table public.analytics_events (
    id uuid default uuid_generate_v4() primary key,
    profile_id uuid references public.profiles(id) on delete set null,
    event_type text not null, -- 'page_view', 'product_view', 'click_affiliate', 'share', 'favorite'
    product_id uuid references public.products(id) on delete set null,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    duration_seconds integer,
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.analytics_events enable row level security;

create policy "Allow inserts to analytics events for anyone" on public.analytics_events
    for insert with check (true);

-- 17. Clicks table
create table public.clicks (
    id uuid default uuid_generate_v4() primary key,
    profile_id uuid references public.profiles(id) on delete set null,
    product_id uuid references public.products(id) on delete set null,
    referrer text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clicks enable row level security;

create policy "Allow inserts to clicks for anyone" on public.clicks
    for insert with check (true);

-- 18. Conversions table
create table public.conversions (
    id uuid default uuid_generate_v4() primary key,
    profile_id uuid references public.profiles(id) on delete set null,
    product_id uuid references public.products(id) on delete set null,
    amount numeric(10, 2),
    commission numeric(10, 2),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.conversions enable row level security;

create policy "Allow inserts to conversions" on public.conversions
    for insert with check (true);

-- 19. Settings table
create table public.settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settings enable row level security;

create policy "Allow read access to settings for all users" on public.settings
    for select using (true);

-- 20. AdminUsers table
create table public.admin_users (
    profile_id uuid references public.profiles(id) on delete cascade primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admin_users enable row level security;

create policy "Allow select for verified admins" on public.admin_users
    for select using (auth.uid() in (select profile_id from public.admin_users));

-- 21. CrawlerJobs table (Tracking automatic marketplace crawlers)
create table public.crawler_jobs (
    id uuid default uuid_generate_v4() primary key,
    marketplace text not null, -- 'Amazon', 'Shopee', etc.
    status text not null, -- 'running', 'success', 'failed'
    products_imported integer default 0 not null,
    error_message text,
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    completed_at timestamp with time zone
);

alter table public.crawler_jobs enable row level security;

-- 22. PriceHistory table (Product price changes over time)
create table public.price_history (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    price numeric(10, 2) not null check (price >= 0),
    recorded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.price_history enable row level security;

create policy "Allow read access to price history for all users" on public.price_history
    for select using (true);

-- 23. InstagramPosts table
create table public.instagram_posts (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    caption text not null,
    hashtags text,
    status text default 'draft' not null, -- 'draft', 'scheduled', 'posted', 'failed'
    post_type text not null, -- 'story', 'reel', 'carousel'
    scheduled_for timestamp with time zone,
    published_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.instagram_posts enable row level security;

-- 24. WhatsappCampaigns table
create table public.whatsapp_campaigns (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    message text not null,
    target_segment jsonb,
    status text default 'draft' not null, -- 'draft', 'scheduled', 'sent', 'failed'
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.whatsapp_campaigns enable row level security;


-- Indexes for optimization
create index idx_products_category on public.products(category_id);
create index idx_products_available on public.products(available);
create index idx_products_slug on public.products(slug);
create index idx_children_profile on public.children(profile_id);
create index idx_favorites_profile on public.favorites(profile_id);
create index idx_recently_viewed_profile on public.recently_viewed(profile_id);
create index idx_analytics_events_type on public.analytics_events(event_type);
create index idx_price_history_product_recorded on public.price_history(product_id, recorded_at desc);

-- Profile trigger to create a public profile when a new user signs up via auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, avatar_url, vip, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Mamãe'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    false,
    false
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

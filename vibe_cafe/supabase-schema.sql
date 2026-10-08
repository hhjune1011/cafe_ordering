-- Supabase SQL Editor에서 실행할 바이브 카페 주문 테이블
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_name text not null
    check (char_length(trim(customer_name)) between 1 and 100),
  drink text not null
    check (drink in ('아메리카노', '카페라떼', '카페모카', '바닐라라떼', '녹차라떼')),
  size text not null
    check (size in ('S', 'M', 'L')),
  options text[] not null default '{}'
    check (options <@ array['샷 추가', '크림 추가', '시럽 추가', '디카페인']::text[]),
  quantity smallint not null
    check (quantity between 1 and 10),
  request text not null default ''
    check (char_length(request) <= 500),
  total integer not null
    check (total >= 0),
  ordered_at timestamptz not null default now()
);

-- 최신 주문을 빠르게 가져오기 위한 인덱스
create index if not exists orders_ordered_at_idx
  on public.orders (ordered_at desc);

-- 안전을 위해 RLS를 켭니다.
-- 정책을 만들기 전까지 브라우저의 anon key로는 주문을 읽거나 쓸 수 없습니다.
alter table public.orders enable row level security;

comment on table public.orders is '바이브 카페 주문 내역';

-- 이전 supabase-schema.sql로 만든 orders 테이블에 실행합니다.
-- 기존 데이터를 보존하면서 새 JavaScript에서 사용하는 열 이름에 맞춥니다.
begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'total'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'total_price'
  ) then
    alter table public.orders rename column total to total_price;
  end if;
end $$;

alter table public.orders
  add column if not exists phone text not null default '',
  add column if not exists drink_price integer not null default 0 check (drink_price >= 0),
  add column if not exists total_price integer not null default 0 check (total_price >= 0);

-- 이전 주문의 음료 기본 가격도 채웁니다.
update public.orders set drink_price = case drink
  when '아메리카노' then 3500
  when '카페라떼' then 4000
  else 4500
end where drink_price = 0;

-- 공개 키 사용자는 주문 접수만 허용합니다. 조회·삭제 권한은 추가하지 않습니다.
alter table public.orders enable row level security;
grant insert (customer_name, phone, drink, drink_price, size, options, quantity, request, total_price)
  on public.orders to anon;
grant usage on sequence public.orders_id_seq to anon;

drop policy if exists cafe_anon_insert on public.orders;
create policy cafe_anon_insert on public.orders
  for insert to anon with check (true);

-- 변경된 열 이름을 REST API가 바로 인식하도록 스키마 캐시를 새로고침합니다.
notify pgrst, 'reload schema';

commit;

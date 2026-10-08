-- 카페라떼 M사이즈에 샷을 추가한 테스트 주문 1건
insert into public.orders (
  customer_name,
  drink,
  size,
  options,
  quantity,
  request,
  total
) values (
  '홍길동',
  '카페라떼',
  'M',
  array['샷 추가'],
  1,
  '얼음은 적게 넣어주세요',
  5000
)
returning *;

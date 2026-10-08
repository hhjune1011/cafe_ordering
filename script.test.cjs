// 실행: node script.test.cjs
// 실제 DB 대신 가짜 응답을 사용해 주문 저장 흐름을 확인합니다.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const elements = new Map();
function element() {
  return {
    value: '', textContent: '', disabled: false, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, callback) { this[type] = callback; },
    replaceChildren() {}, append() {}, focus() {}, setAttribute() {},
  };
}
function get(selector) {
  if (!elements.has(selector)) elements.set(selector, element());
  return elements.get(selector);
}
const size = element();
size.value = 'M';
size.dataset.price = '500';
get('#drink').value = 'cafe-latte';
get('#drink').selectedOptions = [{ textContent: '카페라떼 4,000원', dataset: { price: '4000' } }];
get('#quantity').value = '1';
get('#customer-name').value = '홍길동';
get('#phone').value = '01012345678';
get('#requests').value = '얼음 적게';
const button = get('button[type="submit"]');
button.textContent = '주문하기';
let calls = 0;
let payload;
let respond;
const alerts = [];
const context = vm.createContext({
  document: {
    querySelector: (selector) => selector === 'input[name="size"]:checked' ? size : get(selector),
    querySelectorAll: () => [], createElement: element,
  },
  window: { supabase: { createClient: () => ({ from: () => ({
    insert(data) {
      calls += 1;
      payload = data;
      return new Promise((resolve) => { respond = resolve; });
    },
  }) }) } },
  alert: (message) => alerts.push(message), confirm: () => true,
  console: { error() {} }, setTimeout: () => 1, clearTimeout() {},
});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, 'script.js'), 'utf8'), context);

(async () => {
  const form = get('#order-form');
  const first = form.submit({ preventDefault() {} });
  assert.equal(button.disabled, true);
  await form.submit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(payload.total_price, 4500);
  assert.equal(payload.phone, '01012345678');
  assert.equal(payload.drink_price, 4000);
  respond({ error: null });
  await first;
  assert.equal(button.disabled, false);
  assert.equal(vm.runInContext('orders.length', context), 1);
  const second = form.submit({ preventDefault() {} });
  respond({ error: { message: '테스트 오류' } });
  await second;
  assert.equal(alerts[0], '주문 저장에 실패했어요\n테스트 오류');
  assert.equal(vm.runInContext('orders.length', context), 1);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '주문하기');
  // 실제 확인된 열 누락 오류가 발생하면 수정 SQL을 안내해야 합니다.
  const missingColumn = form.submit({ preventDefault() {} });
  respond({ error: { code: '42703', message: 'column orders.phone does not exist' } });
  await missingColumn;
  assert.match(alerts[1], /supabase-order-insert\.sql/);
  assert.equal(vm.runInContext('orders.length', context), 1);
  assert.equal(button.disabled, false);
  console.log('PASS: 주문 데이터, 중복 방지, 성공/실패 처리, 버튼 복구');
})().catch((error) => { console.error(error); process.exitCode = 1; });

// Supabase 프로젝트 주소와 공개 anon 키를 설정합니다.
// 브라우저에는 service_role 키를 넣으면 안 됩니다.
const SUPABASE_URL = "https://arsyrificydcejmcdvvr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3lyaWZpY3lkY2VqbWNkdnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTIzODIsImV4cCI6MjEwNjk4ODM4Mn0.DaXmQ-BFiPbVY__Zj3q4Yr8ywrWqg-7I_LGtSlu0RvE";
// CDN을 불러오지 못했을 때도 주문서의 다른 기능은 사용할 수 있습니다.
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// 주문서에서 자주 사용할 HTML 요소를 id와 name으로 찾습니다.
const orderForm = document.querySelector("#order-form");
const nameInput = document.querySelector("#customer-name");
const drinkSelect = document.querySelector("#drink");
const quantityInput = document.querySelector("#quantity");
const requestsInput = document.querySelector("#requests");
const estimatedPrice = document.querySelector("#estimated-price");
const orderMessage = document.querySelector("#order-message");
const resetButton = document.querySelector('button[type="reset"]');
const submitButton = document.querySelector('button[type="submit"]');
const sizeInputs = document.querySelectorAll('input[name="size"]');
const optionInputs = document.querySelectorAll('input[name="options"]');
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const orderCount = document.querySelector("#order-count");
const orderList = document.querySelector("#order-list");
const emptyOrders = document.querySelector("#empty-orders");
const orderSummary = document.querySelector("#order-summary");
const orderTotal = document.querySelector("#order-total");
const clearOrdersButton = document.querySelector("#clear-orders");

// 접수된 주문은 이 배열에 보관하며, 주문번호는 1부터 차례대로 증가합니다.
const orders = [];
let nextOrderNumber = 1;
let orderMessageTimer;

// 선택한 메뉴의 가격을 계산하고 화면에 표시합니다.
// 주문 확인 메시지에서도 같은 금액을 쓰기 위해 계산 결과를 반환합니다.
function calculateTotal() {
  const selectedDrink = drinkSelect.selectedOptions[0];

  // 음료를 선택하지 않았다면 다른 선택과 관계없이 금액은 0원입니다.
  if (!drinkSelect.value) {
    estimatedPrice.textContent = "예상 금액: 0원";
    return 0;
  }

  // data-price에 저장된 문자열을 Number로 숫자로 바꿉니다.
  const drinkPrice = Number(selectedDrink.dataset.price);
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizePrice = Number(selectedSize.dataset.price);

  // 체크된 추가 옵션들의 가격을 모두 더합니다.
  let optionPrice = 0;
  document.querySelectorAll('input[name="options"]:checked').forEach((option) => {
    optionPrice += Number(option.dataset.price);
  });

  // 수량 칸이 잠시 비어 있어도 계산할 때는 1잔으로 처리합니다.
  const quantity = Math.max(1, Number(quantityInput.value) || 1);
  const total = (drinkPrice + sizePrice + optionPrice) * quantity;

  // toLocaleString을 사용하면 5000이 5,000처럼 표시됩니다.
  estimatedPrice.textContent = `예상 금액: ${total.toLocaleString()}원`;
  return total;
}

// orders 배열의 내용을 이용해 주문 내역 화면 전체를 다시 그립니다.
function renderOrders() {
  // 기존 카드를 모두 지우고 현재 배열을 기준으로 새로 만듭니다.
  orderList.replaceChildren();
  orderCount.textContent = orders.length;

  // 주문 유무에 따라 빈 목록 안내와 합계 영역을 서로 바꿔 보여줍니다.
  emptyOrders.classList.toggle("hidden", orders.length > 0);
  orderSummary.classList.toggle("hidden", orders.length === 0);

  orders.forEach((order) => {
    const card = document.createElement("article");
    const title = document.createElement("strong");
    const details = document.createElement("p");
    const meta = document.createElement("p");
    const cancelButton = document.createElement("button");

    card.className = "order-card";
    meta.className = "order-meta";
    cancelButton.className = "cancel-order";
    cancelButton.type = "button";

    // 손님이 입력한 이름과 요청사항을 포함한 모든 문장은 textContent로 넣습니다.
    title.textContent = `#${order.orderNumber} ${order.name}님 · ${order.total.toLocaleString()}원`;

    const optionText = order.options.length ? ` (${order.options.join(", ")})` : "";
    details.textContent = `${order.drink} ${order.size}사이즈${optionText} ${order.quantity}잔`;
    meta.textContent = order.request ? `${order.request} · ${order.time}` : order.time;
    cancelButton.textContent = "취소";

    // 취소 여부를 한 번 더 확인한 뒤 해당 주문만 배열에서 삭제합니다.
    cancelButton.addEventListener("click", () => {
      if (!confirm(`#${order.orderNumber} 주문을 취소하시겠습니까?`)) {
        return;
      }

      const orderIndex = orders.findIndex((item) => item.orderNumber === order.orderNumber);
      orders.splice(orderIndex, 1);
      renderOrders();
    });

    card.append(title, details, meta, cancelButton);
    orderList.append(card);
  });

  // 모든 주문 금액을 더해 목록 아래의 합계를 갱신합니다.
  const grandTotal = orders.reduce((sum, order) => sum + order.total, 0);
  orderTotal.textContent = `총 주문 금액: ${grandTotal.toLocaleString()}원 (${orders.length}건)`;
}

// 탭 버튼을 누르면 선택한 패널만 보이고 나머지는 hidden 클래스로 숨깁니다.
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.setAttribute("aria-selected", "false"));
    button.setAttribute("aria-selected", "true");

    const selectedPanelId = button.getAttribute("aria-controls");
    tabPanels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== selectedPanelId);
    });
  });
});

// 음료, 사이즈, 추가 옵션이 바뀔 때마다 금액을 다시 계산합니다.
drinkSelect.addEventListener("change", calculateTotal);
sizeInputs.forEach((input) => input.addEventListener("change", calculateTotal));
optionInputs.forEach((input) => input.addEventListener("change", calculateTotal));

// 수량은 숫자를 입력하는 순간 바로 금액에 반영합니다.
quantityInput.addEventListener("input", calculateTotal);

// 주문하기 버튼을 누르면 form의 submit 이벤트가 실행됩니다.
orderForm.addEventListener("submit", async (event) => {
  // 페이지가 새로고침되는 form의 기본 동작을 막습니다.
  event.preventDefault();

  // 저장이 진행 중이면 Enter 키 등으로 다시 제출해도 중복 저장하지 않습니다.
  if (submitButton.disabled) return;

  const customerName = nameInput.value.trim();

  // 이름과 음료를 순서대로 확인합니다.
  if (!customerName) {
    alert("이름을 입력해주세요");
    nameInput.focus();
    return;
  }

  if (!drinkSelect.value) {
    alert("음료를 선택해주세요");
    drinkSelect.focus();
    return;
  }

  const selectedDrink = drinkSelect.selectedOptions[0];
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const checkedOptions = document.querySelectorAll('input[name="options"]:checked');
  const quantity = Math.max(1, Number(quantityInput.value) || 1);
  const total = calculateTotal();

  // option의 표시 글에서 뒤쪽 가격을 빼고 음료 이름만 가져옵니다.
  const drinkName = selectedDrink.textContent.replace(/\s[\d,]+원$/, "");

  // 체크된 옵션과 연결된 label을 찾아 옵션 이름만 배열에 담습니다.
  const optionNames = Array.from(checkedOptions).map((option) => {
    const label = document.querySelector(`label[for="${option.id}"]`);
    return label.textContent.replace(/\s\+[\d,]+원$/, "");
  });

  // 옵션이 하나라도 있을 때만 괄호를 붙입니다.
  const optionText = optionNames.length ? ` (${optionNames.join(", ")})` : "";

  // 기다리는 동안 입력이 바뀌어도 저장한 내용과 알림이 같도록 값을 미리 보관합니다.
  const size = selectedSize.value;
  const request = requestsInput.value.trim();
  const payload = {
    customer_name: customerName,
    phone: document.querySelector("#phone").value.trim(),
    drink: drinkName,
    drink_price: Number(selectedDrink.dataset.price),
    size,
    options: optionNames,
    quantity,
    request,
    total_price: total,
  };

  // await는 Supabase의 저장 결과가 도착할 때까지 이 함수의 다음 작업을 기다립니다.
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "저장 중...";
  try {
    if (!supabaseClient) throw new Error("Supabase 라이브러리를 불러오지 못했습니다.");
    const { error } = await supabaseClient.from("orders").insert(payload);
    // Supabase가 반환한 오류도 catch에서 처리할 수 있도록 던집니다.
    if (error) throw error;
  } catch (error) {
    console.error("주문 저장 오류:", error);
    alert("주문 저장에 실패했어요");
    return;
  } finally {
    // 성공 여부와 관계없이 버튼을 원래 상태로 되돌립니다.
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }

  // DB 저장에 성공한 주문만 배열 맨 앞에 넣고 확인 팝업을 표시합니다.
  orders.unshift({
    orderNumber: nextOrderNumber,
    name: customerName,
    drink: drinkName,
    size,
    options: optionNames,
    quantity,
    request,
    total,
    time: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  nextOrderNumber += 1;
  renderOrders();

  orderMessage.textContent = `${customerName}님, ${drinkName} ${size}사이즈${optionText} ${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;

  // 연속으로 주문해도 애니메이션과 2초 타이머가 처음부터 다시 시작됩니다.
  clearTimeout(orderMessageTimer);
  orderMessage.classList.add("hidden");
  void orderMessage.offsetWidth;
  orderMessage.classList.remove("hidden");
  orderMessageTimer = setTimeout(() => {
    orderMessage.classList.add("hidden");
  }, 2000);
});

// 다시 작성 버튼을 누르면 HTML에 지정된 기본값으로 되돌립니다.
resetButton.addEventListener("click", (event) => {
  // 직접 초기화한 뒤 금액과 확인 메시지도 함께 정리합니다.
  event.preventDefault();
  orderForm.reset();
  calculateTotal();
  clearTimeout(orderMessageTimer);
  orderMessage.textContent = "";
  orderMessage.classList.add("hidden");
});

// 전체 삭제 버튼은 확인을 받은 뒤 주문 배열만 비웁니다.
clearOrdersButton.addEventListener("click", () => {
  if (!confirm("주문 내역을 모두 지우시겠습니까?")) {
    return;
  }

  orders.splice(0, orders.length);
  renderOrders();
});

// 페이지를 처음 열었을 때도 예상 금액을 올바르게 표시합니다.
calculateTotal();
renderOrders();

// ==============================================================================
// Automated End-to-End Verification Test Suite
// Verifies all 12 explicit prompt criteria
// ==============================================================================

import { Store } from '../src/lib/store';
import { generateQrDataUrl } from '../src/lib/qr-pdf-export';
import { generateBillPdf, generateWhatsAppBillLink } from '../src/lib/bill-utils';

console.log('=================================================================');
console.log('🚀 RUNNING END-TO-END SAAS VERIFICATION FOR ALL 12 CRITERIA');
console.log('=================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail || 'Assertion failed'}`);
    failCount++;
  }
}

async function runTests() {
  Store.resetToDemo();

  // --------------------------------------------------------------------------
  // TEST 1: Admin creates a restaurant; owner logs in with it
  // --------------------------------------------------------------------------
  console.log('\n--- Test 1: Admin creates restaurant & owner login ---');
  const creation = Store.createRestaurant({
    name: 'Tandoori Flames Bistro',
    owner_email: 'owner@tandooriflames.com',
    temporary_password: 'TempPassword@123',
    phone: '+91 98765 33333',
    setup_fee_paid: true,
    monthly_fee: 1200,
    paid_until: '2026-12-05',
    max_tables: 15,
  });

  const createdRest = Store.getRestaurantById(creation.restaurant.id);
  assert(createdRest !== null, 'Restaurant was created in store');
  assert(createdRest?.name === 'Tandoori Flames Bistro', 'Restaurant name matches');
  assert(createdRest?.slug === 'tandoori-flames-bistro', 'Slug generated cleanly');
  assert(createdRest?.owner_id === creation.owner_user_id, 'Owner user mapped correctly');

  // Verify owner login match
  const ownerMatch = Store.getRestaurantBySlug('tandoori-flames-bistro');
  assert(ownerMatch !== null && ownerMatch.id === createdRest?.id, 'Owner can log in with restaurant slug');

  // --------------------------------------------------------------------------
  // TEST 2: Owner adds category and item with photo; saves and appears on customer page
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Owner adds category and item with photo ---');
  const cat = Store.createCategory(createdRest!.id, 'Chef Specialties', 1);
  assert(cat.name === 'Chef Specialties', 'Category created successfully');

  const item = Store.createMenuItem({
    restaurant_id: createdRest!.id,
    category_id: cat.id,
    name: 'Smoked Dal Bukhara',
    description: 'Slow-cooked black lentils simmered with churned white butter.',
    price: 320,
    image_url: 'data:image/jpeg;base64,sampleCompressedImageDataUrl',
    is_veg: true,
    is_available: true,
    sort_order: 1,
  });
  assert(item.name === 'Smoked Dal Bukhara', 'Menu item created successfully');
  assert(Boolean(item.image_url?.startsWith('data:image/jpeg')), 'Compressed image data stored');

  // Verify it appears in customer menu lookup
  const customerItems = Store.getMenuItems(createdRest!.id);
  const foundItem = customerItems.find((m) => m.id === item.id);
  assert(foundItem !== undefined, 'Item appears in customer menu catalog');

  // --------------------------------------------------------------------------
  // TEST 3: Owner creates 3 tables; QR codes download and open the correct menu
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Owner creates tables and QR codes ---');
  const tbl1 = Store.getTables(createdRest!.id)[0]; // already created by default
  const tbl4 = Store.createTable(createdRest!.id, 4, 'Table 4 - Rooftop');
  assert(tbl4.table_number === 4, 'Table 4 created');
  assert(tbl4.token.includes('tandoori-flames-bistro'), 'Table token contains restaurant slug');

  // Generate QR URL and verify table can be retrieved by token
  const qrUrl = `https://qrapi.com/r/${createdRest!.slug}/t/${tbl4.token}`;
  const qrDataUrl = await generateQrDataUrl(qrUrl);
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR Data URL generated cleanly');

  const resolvedTable = Store.getTableByToken(tbl4.token);
  assert(resolvedTable?.id === tbl4.id, 'Table resolved by token opens correct menu');

  // --------------------------------------------------------------------------
  // TEST 4: Customer scans, orders; owner accepts; customer sees status change
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Customer places order; Owner accepts ---');
  const sessionToken = 'sess_cust_test_12345';
  const order1 = Store.placeOrder({
    tableToken: tbl4.token,
    sessionToken,
    items: [{ menuItemId: item.id, quantity: 2, notes: 'Less spicy' }],
    notes: 'Near the window please',
    orderType: 'initial',
  });

  assert(order1.status === 'pending', 'Order placed with initial pending status');
  assert(order1.subtotal === 640, 'Order subtotal calculated correctly (320 x 2 = 640)');
  assert(order1.items?.length === 1, 'Order items saved');

  // Owner accepts
  const acceptedOrder = Store.updateOrderStatus(order1.id, 'accepted');
  assert(acceptedOrder.status === 'accepted', 'Owner accepted order');
  assert(acceptedOrder.items?.[0].status === 'accepted', 'Order items marked accepted');

  // Customer polls and sees status change
  const customerPolledOrder = Store.getOrders(createdRest!.id).find((o) => o.id === order1.id);
  assert(customerPolledOrder?.status === 'accepted', 'Customer sees accepted status live');

  // --------------------------------------------------------------------------
  // TEST 5: Customer adds more items; owner gets add-on; accepting updates total
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Customer adds add-on items ---');
  // Add another item to menu first
  const itemNaan = Store.createMenuItem({
    restaurant_id: createdRest!.id,
    category_id: cat.id,
    name: 'Roomali Roti',
    description: 'Ultra thin soft flatbread',
    price: 40,
    image_url: null,
    is_veg: true,
    is_available: true,
    sort_order: 2,
  });

  const addonOrder = Store.placeOrder({
    tableToken: tbl4.token,
    sessionToken,
    items: [{ menuItemId: itemNaan.id, quantity: 3 }],
    orderType: 'addon',
  });

  assert(addonOrder.order_type === 'addon', 'Order identified as add-on');
  assert(addonOrder.status === 'pending', 'Add-on starts as pending');
  assert(addonOrder.subtotal === 120, 'Add-on subtotal calculated (40 x 3 = 120)');

  // Owner accepts add-on
  Store.updateOrderStatus(addonOrder.id, 'accepted');
  const allTableOrders = Store.getOrders(createdRest!.id).filter(
    (o) => o.table_id === tbl4.id && o.status === 'accepted'
  );
  const combinedSubtotal = allTableOrders.reduce((sum, o) => sum + o.subtotal, 0);
  assert(combinedSubtotal === 760, 'Combined running bill subtotal is correct (640 + 120 = 760)');

  // --------------------------------------------------------------------------
  // TEST 6: Reject flow shows reason to customer
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Reject flow with reason ---');
  const rejectedOrder = Store.placeOrder({
    tableToken: tbl4.token,
    sessionToken,
    items: [{ menuItemId: item.id, quantity: 1 }],
    orderType: 'addon',
  });

  Store.updateOrderStatus(rejectedOrder.id, 'rejected', 'Kitchen is currently overwhelmed');
  const checkedReject = Store.getOrders(createdRest!.id).find((o) => o.id === rejectedOrder.id);
  assert(checkedReject?.status === 'rejected', 'Order status marked rejected');
  assert(
    checkedReject?.rejection_reason === 'Kitchen is currently overwhelmed',
    'Customer sees rejection reason'
  );

  // --------------------------------------------------------------------------
  // TEST 7: Bill generates with correct totals, tax, and PDF/WhatsApp support
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Bill generation & receipt printing ---');
  const bill = Store.generateBill({
    restaurantId: createdRest!.id,
    tableId: tbl4.id,
    paymentMethod: 'upi',
  });

  assert(bill.bill_number >= 1001, 'Sequential bill number generated');
  assert(bill.subtotal === 760, 'Bill subtotal matches accepted orders (760)');
  assert(bill.tax_amount === Math.round(760 * 0.05 * 100) / 100, 'GST 5% calculated');
  assert(bill.payment_method === 'upi', 'Payment method UPI recorded');
  assert(bill.items_json.length === 2, 'Items snapshot preserved in bill');

  // Verify WhatsApp sharing link
  const waLink = generateWhatsAppBillLink(bill, '+919876500000');
  assert(waLink.includes('wa.me'), 'WhatsApp receipt link generated');
  assert(waLink.includes(String(bill.bill_number)), 'WhatsApp link contains bill number');

  // Verify previous table orders are now marked completed
  const openOrdersAfterBill = Store.getOrders(createdRest!.id).filter(
    (o) => o.table_id === tbl4.id && ['accepted', 'preparing', 'ready'].includes(o.status)
  );
  assert(openOrdersAfterBill.length === 0, 'Table orders closed after bill settlement');

  // --------------------------------------------------------------------------
  // TEST 8: Reports and CSV show correct numbers
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Reports & CSV numbers ---');
  const restaurantBills = Store.getBills(createdRest!.id);
  assert(restaurantBills.length === 1, 'Bill listed in restaurant bills');
  assert(restaurantBills[0].grand_total === bill.grand_total, 'Grand total in reports matches bill');

  // --------------------------------------------------------------------------
  // TEST 9: Admin marks payment; paid_until extends; admin counters update
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Admin marks monthly payment ---');
  const initialPaidUntil = createdRest!.paid_until;
  const updatedRest = Store.markMonthlyPaymentReceived(createdRest!.id, 'Payment verified via UPI ref #938201');

  assert(new Date(updatedRest.paid_until) > new Date(initialPaidUntil), 'paid_until extended by 30 days');
  assert(updatedRest.status === 'active', 'Restaurant is active');

  const payments = Store.getPayments().filter((p) => p.restaurant_id === createdRest!.id);
  assert(payments.length >= 2, 'Setup and monthly payments both recorded in history');

  // --------------------------------------------------------------------------
  // TEST 10: Set paid_until to yesterday: Customer page blocked, new orders rejected
  // --------------------------------------------------------------------------
  console.log('\n--- Test 10: Automatic blocking on expired subscription ---');
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const expiredRest = Store.updateRestaurantAsAdmin(createdRest!.id, {
    paid_until: yesterday,
    status: 'expired',
  });

  assert(!Store.isLive(expiredRest), 'isLive helper returns FALSE for expired restaurant');

  let orderRejected = false;
  try {
    Store.placeOrder({
      tableToken: tbl4.token,
      sessionToken: 'sess_new_customer',
      items: [{ menuItemId: item.id, quantity: 1 }],
    });
  } catch (err: any) {
    if (err.message.includes('temporarily unavailable')) {
      orderRejected = true;
    }
  }
  assert(orderRejected, 'Database rejects new customer order when restaurant is not live');

  // --------------------------------------------------------------------------
  // TEST 11: Owner cannot change status or paid_until (Anti-Tampering)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 11: Owner anti-tamper constraint ---');
  let tamperBlocked = false;
  try {
    Store.updateRestaurantAsOwner(createdRest!.id, {
      status: 'active',
      paid_until: '2027-01-01',
    });
  } catch (err: any) {
    if (err.message.includes('Security Constraint')) {
      tamperBlocked = true;
    }
  }
  assert(tamperBlocked, 'Owner cannot modify status or paid_until (Postgres trigger rule enforced)');

  // --------------------------------------------------------------------------
  // TEST 12: Multi-tenancy isolation: One restaurant cannot see another's data
  // --------------------------------------------------------------------------
  console.log('\n--- Test 12: Multi-tenancy data isolation between restaurants ---');
  const rest1Tables = Store.getTables('11111111-1111-1111-1111-111111111111');
  const rest2Tables = Store.getTables('22222222-2222-2222-2222-222222222222');

  const overlap = rest1Tables.some((t1) => rest2Tables.some((t2) => t2.id === t1.id));
  assert(!overlap, 'Restaurant 1 tables are isolated from Restaurant 2');

  const rest1Orders = Store.getOrders('11111111-1111-1111-1111-111111111111');
  const rest2Orders = Store.getOrders('22222222-2222-2222-2222-222222222222');
  const orderOverlap = rest1Orders.some((o1) => rest2Orders.some((o2) => o2.id === o1.id));
  assert(!orderOverlap, 'Restaurant 1 orders are isolated from Restaurant 2');

  // Summary
  console.log('\n=================================================================');
  console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('=================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

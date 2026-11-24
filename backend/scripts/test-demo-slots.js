/**
 * Demo slot calendar checks: Sunday closed, gap rule, book conflict.
 *
 * Usage:
 *   node scripts/test-demo-slots.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const moment = require("moment-timezone");
const { Op } = require("sequelize");
const {
  TZ,
  listAvailableSlots,
  bookDemoSlot,
  isSlotAvailable,
  parseScheduledAt,
} = require("../app/helper/aiAgentDemoSlots");
const AiAgentDemoSlot = require("../app/models/ai_agent_demo_slots");

const TENANT = "00000000-0000-4000-8000-000000000099";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

(async () => {
  await AiAgentDemoSlot.sync({ alter: false });

  // Clean prior test rows
  await AiAgentDemoSlot.destroy({
    where: { tenantId: TENANT, waId: "test_demo_slots" },
  });

  const sunday = moment().tz(TZ).day(0);
  if (sunday.isBefore(moment().tz(TZ), "day")) sunday.add(7, "days");
  const sunYmd = sunday.format("YYYY-MM-DD");
  const sunList = await listAvailableSlots({ tenantId: TENANT, dateYmd: sunYmd });
  assert(sunList.slots.length === 0, "Sunday should have no slots");
  assert(sunList.reason === "sunday_closed", "Sunday reason");

  // Next weekday (Mon–Sat)
  let day = moment().tz(TZ).add(1, "day").startOf("day");
  while (day.day() === 0) day.add(1, "day");
  const ymd = day.format("YYYY-MM-DD");

  const before = await listAvailableSlots({ tenantId: TENANT, dateYmd: ymd });
  assert(before.ok, "list ok");
  assert(before.slots.length > 0, "weekday should have slots");
  console.log("Sample slots:", before.labels.slice(0, 5).join(", "));

  const ten = parseScheduledAt(`${ymd} 10:00`);
  const book10 = await bookDemoSlot({
    tenantId: TENANT,
    scheduledAt: ten,
    conversation: { id: null, waId: "test_demo_slots", customerPhone: "919999999999" },
    lead: {
      id: null,
      waId: "test_demo_slots",
      fullName: "Slot Test",
      phone: "919999999999",
    },
    meta: { test: true },
  });
  // leadId null may fail FK? model allows null. Good.
  assert(book10.ok, `10:00 book should succeed: ${book10.reason}`);
  // Patch waId on created row for cleanup
  if (book10.slot) {
    await book10.slot.update({ waId: "test_demo_slots" });
  }

  const tenThirty = await isSlotAvailable({
    tenantId: TENANT,
    scheduledAt: parseScheduledAt(`${ymd} 10:30`),
  });
  assert(!tenThirty.ok && tenThirty.reason === "outside_grid", "10:30 not on hourly grid");

  const tenConflict = await isSlotAvailable({
    tenantId: TENANT,
    scheduledAt: parseScheduledAt(`${ymd} 10:00`),
  });
  assert(!tenConflict.ok && tenConflict.reason === "conflict", "same 10:00 should conflict");

  // Force a near-conflict by checking 10:00 booked then 11:00 free
  const eleven = await isSlotAvailable({
    tenantId: TENANT,
    scheduledAt: parseScheduledAt(`${ymd} 11:00`),
  });
  assert(eleven.ok, "11:00 should be free after 10:00 (exactly 60 min gap)");

  const book11 = await bookDemoSlot({
    tenantId: TENANT,
    scheduledAt: parseScheduledAt(`${ymd} 11:00`),
    meta: { test: true },
    conversation: { waId: "test_demo_slots" },
    lead: { waId: "test_demo_slots", fullName: "Slot Test 2", phone: "919999999999" },
  });
  assert(book11.ok, `11:00 book should succeed: ${book11.reason}`);
  if (book11.slot) await book11.slot.update({ waId: "test_demo_slots" });

  const after = await listAvailableSlots({ tenantId: TENANT, dateYmd: ymd });
  assert(
    !after.slots.some((s) => s.local.endsWith("10:00") || s.local.endsWith("11:00")),
    "booked 10:00 and 11:00 should disappear from available list"
  );

  // Cleanup
  await AiAgentDemoSlot.destroy({
    where: { tenantId: TENANT, waId: { [Op.eq]: "test_demo_slots" } },
  });
  // Also destroy by meta.test if waId missed
  await AiAgentDemoSlot.destroy({
    where: {
      tenantId: TENANT,
      meta: { test: true },
    },
  }).catch(() => {});

  console.log("PASS: demo slot Sunday / gap / book checks OK");
  process.exit(0);
})().catch(async (e) => {
  console.error("FAIL:", e.message || e);
  try {
    await AiAgentDemoSlot.destroy({ where: { tenantId: TENANT } });
  } catch (_) {}
  process.exit(1);
});

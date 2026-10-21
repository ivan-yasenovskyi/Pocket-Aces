import { STAT_DAYS } from "../config.ts";
import type { Answer, Data, Match, Registration, Slot, Training } from "../storage.ts";
import { formatWhen, pad, weekdayName } from "../time.ts";

export const POLL_OPTIONS: { answer: Answer; text: string }[] = [
  { answer: "yes", text: "✅ Буду" },
  { answer: "no", text: "❌ Не буду" },
  { answer: "maybe", text: "🤔 Ще не знаю" },
];

export const HELP_TEXT = [
  "<b>🏐 Бот тренувань Pocket Aces</b>",
  "",
  "Я публікую опитування про тренування і рахую, хто буде.",
  "",
  "<b>Для всіх</b>",
  "/hto — хто буде на найближчому тренуванні",
  "/rozklad — розклад і найближчі тренування",
  `/stat — хто скільки разів відмічався за ${STAT_DAYS} днів`,
  "",
  "<b>Для адміністраторів</b>",
  "/trening 24.10 19:00 Зал — разове тренування",
  "/rozklad_dodaty вт 19:00 Зал — постійне тренування щотижня",
  "/rozklad_vydalyty 1 — прибрати постійне тренування №1",
  "/skasuvaty — скасувати найближче тренування",
  "/vidvyazaty 11 — відв'язати картку гравця на сайті",
  "",
  "<b>Матчі</b>",
  "Матчі ліги бот сам бере з siatka-lodzkie.org і в четвер перед грою о 10:00 публікує опитування «хто грає» (у середу ліга часто змінює час).",
  "/sklad — хто грає в найближчому матчі",
  "/matchi — список матчів",
  "",
  "<b>Матчі (адміністратори)</b>",
  "/liga — оновити матчі з сайту ліги зараз",
  "Фото з матчу — надішли фото чи альбом з підписом /foto (або /foto 3 — до матчу №3), і вони з'являться на сайті",
  "/match 02.11 18:00 Суперник | Зал — додати матч",
  "/rakhunok 3:1 — рахунок останнього зіграного матчу (або /rakhunok 2 3:1 — матчу №2)",
  "/pokaznyky 11 12 2 1 87 — показники гравця №11 в останньому матчі: очки, ейси, блоки, подача %",
  "/match_vydalyty 2 — видалити матч №2",
  "/zayavky — заявки на турнір із сайту",
  "",
  "Усе це (і турнір) зручніше робити на сайті: Panel kapitana — /admin",
].join("\n");

export const LOGIN_OK_TEXT =
  "✅ Вхід підтверджено! Повертайся на сайт — твій кабінет уже відкривається.";

export const LOGIN_DENIED_TEXT =
  "❌ Тебе немає в групі команди Pocket Aces, тому увійти на сайт не можна.";

export const LOGIN_EXPIRED_TEXT =
  "Посилання для входу застаріло. Натисни «Zaloguj się przez Telegram» на сайті ще раз.";

export const PRIVATE_TEXT =
  "Привіт! Додай мене в групу команди, і адміністратор групи хай напише там /start.";

export const NOT_BOUND_TEXT =
  "Я ще не підключений до цієї групи. Адміністратор має написати тут /start.";

export const ADMIN_ONLY_TEXT = "Цю команду може використовувати лише адміністратор групи.";

export const BOUND_TEXT =
  "✅ Готово! Тепер я працюю в цій групі.\n\nДодайте постійний розклад командою /rozklad_dodaty або разове тренування командою /trening. Усі команди: /help";

export function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function placeSuffix(place: string): string {
  return place ? ` · ${place}` : "";
}

export function pollQuestion(startsAt: Date, place: string): string {
  return `🏐 Тренування: ${formatWhen(startsAt)}${placeSuffix(place)}`;
}

function nameOf(data: Data, userId: string): string {
  return data.members[userId]?.name ?? "Без імені";
}

function list(names: string[]): string {
  if (names.length === 0) return "—";
  return names
    .sort((a, b) => a.localeCompare(b, "uk"))
    .map(escapeHtml)
    .join(", ");
}

export function countVotes(training: Training): Record<Answer, number> {
  const counts: Record<Answer, number> = { yes: 0, no: 0, maybe: 0 };
  for (const answer of Object.values(training.votes)) counts[answer] += 1;
  return counts;
}

export function attendanceText(
  training: Pick<Training, "startsAt" | "place" | "votes">,
  data: Data,
  title = "🏐",
): string {
  const groups: Record<Answer, string[]> = { yes: [], no: [], maybe: [] };
  for (const [userId, answer] of Object.entries(training.votes)) {
    groups[answer].push(nameOf(data, userId));
  }
  const silent = Object.values(data.members)
    .filter((member) => !(String(member.id) in training.votes))
    .map((member) => member.name);

  return [
    `<b>${title} ${escapeHtml(formatWhen(new Date(training.startsAt)) + placeSuffix(training.place))}</b>`,
    "",
    `✅ Будуть (${groups.yes.length}): ${list(groups.yes)}`,
    `🤔 Під питанням (${groups.maybe.length}): ${list(groups.maybe)}`,
    `❌ Не будуть (${groups.no.length}): ${list(groups.no)}`,
    `⏳ Ще не відповіли (${silent.length}): ${list(silent)}`,
  ].join("\n");
}

export function slotText(slot: Slot): string {
  return `${weekdayName(slot.weekday)} о ${pad(slot.hour)}:${pad(slot.minute)}${placeSuffix(slot.place)}`;
}

export function scheduleText(data: Data, upcoming: Training[]): string {
  const lines = ["<b>📅 Постійний розклад</b>"];
  if (data.slots.length === 0) {
    lines.push("Ще порожньо. Додати: /rozklad_dodaty вт 19:00 Зал");
  } else {
    data.slots.forEach((slot, i) => lines.push(`${i + 1}. ${escapeHtml(slotText(slot))}`));
  }

  lines.push("", "<b>🏐 Найближчі тренування</b>");
  if (upcoming.length === 0) {
    lines.push("Поки немає.");
  } else {
    for (const training of upcoming) {
      const c = countVotes(training);
      const when = formatWhen(new Date(training.startsAt)) + placeSuffix(training.place);
      lines.push(`• ${escapeHtml(when)} — ✅ ${c.yes} · 🤔 ${c.maybe} · ❌ ${c.no}`);
    }
  }
  return lines.join("\n");
}

export function matchText(match: Match): string {
  const result = match.result
    ? ` ${match.result.us > match.result.them ? "✅" : "❌"} ${match.result.us}:${match.result.them}`
    : "";
  return `${formatWhen(new Date(match.startsAt))} — ${match.opponent}${placeSuffix(match.place)}${result}`;
}

export function matchup(match: Match): string {
  return match.home === false ? `${match.opponent} – Pocket Aces` : `Pocket Aces – ${match.opponent}`;
}

export function matchPollQuestion(match: Match): string {
  const round = match.round ? ` (${match.round} kolejka)` : "";
  return `🏐 Матч${round}: ${matchup(match)} · ${formatWhen(new Date(match.startsAt))}${placeSuffix(match.place)}. Хто грає?`;
}

export function matchesListText(matches: Match[]): string {
  if (matches.length === 0) return "Матчів ще немає. Додати: /match 02.11 18:00 Суперник | Зал";
  return [
    "<b>🏆 Матчі</b>",
    "",
    ...matches.map((match, i) => `${i + 1}. ${escapeHtml(matchText(match))}`),
  ].join("\n");
}

const LEVEL_NAMES: Record<Registration["level"], string> = {
  "1st": "I ліга",
  "2nd": "II ліга",
  "3rd": "III ліга",
  independent: "без ліги",
};

export function registrationText(r: Registration): string {
  const city = r.city ? `, ${r.city}` : "";
  const instagram = r.instagram ? ` · instagram.com/${r.instagram}` : "";
  return `<b>${escapeHtml(r.teamName)}</b>${escapeHtml(city)} (${LEVEL_NAMES[r.level]})\nКапітан: ${escapeHtml(r.captainName)} · ${escapeHtml(r.phone)} · ${escapeHtml(r.email)}${escapeHtml(instagram)}`;
}

export function registrationsText(registrations: Registration[], maxTeams: number): string {
  if (registrations.length === 0) return "Заявок на турнір ще немає.";
  return [
    `<b>📝 Заявки на турнір</b> (${registrations.length}/${maxTeams})`,
    ...registrations.map((r, i) => `${i + 1}. ${registrationText(r)}`),
  ].join("\n\n");
}

export function statText(data: Data, trainings: Training[]): string {
  if (trainings.length === 0) {
    return `За останні ${STAT_DAYS} днів тренувань ще не було.`;
  }

  const rows = new Map<string, { name: string; yes: number; maybe: number; no: number; silent: number }>();
  const ids = new Set(Object.keys(data.members));
  for (const training of trainings) {
    for (const userId of Object.keys(training.votes)) ids.add(userId);
  }
  for (const userId of ids) {
    rows.set(userId, { name: nameOf(data, userId), yes: 0, maybe: 0, no: 0, silent: 0 });
  }
  for (const training of trainings) {
    for (const [userId, row] of rows) {
      const answer = training.votes[userId];
      if (answer) row[answer] += 1;
      else row.silent += 1;
    }
  }

  const sorted = [...rows.values()].sort((a, b) => b.yes - a.yes || a.name.localeCompare(b.name, "uk"));
  return [
    `<b>📊 Відмітки за ${STAT_DAYS} днів</b> (тренувань: ${trainings.length})`,
    "",
    ...sorted.map((r) => `${escapeHtml(r.name)} — ✅ ${r.yes} · 🤔 ${r.maybe} · ❌ ${r.no} · ⏳ ${r.silent}`),
  ].join("\n");
}

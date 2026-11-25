import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { CardsStore, WidgetStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { countPassed, emptyState, makePlan } from '../widget/plan.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });

const WidgetSlotSchema = z
  .object({ at: z.string(), cardId: z.string(), word: z.string(), translation: z.string(), look: z.number().int() }) // look: 1 to 5, the look this slot is for that word
  .openapi('WidgetSlot');
const WidgetPlanSchema = z
  .object({ slots: z.array(WidgetSlotSchema), endsAt: z.string().nullable() }) // endsAt: the end of the last slot; null with no slots
  .openapi('WidgetPlan');

const getPlan = createRoute({
  method: 'get',
  path: '/widget/plan',
  security: [{ bearer: [] }],
  responses: { 200: json(WidgetPlanSchema, 'The hard words for the widget, one per 30-minute slot, for the next 48 hours'), 401: json(UnauthorizedSchema, 'No valid login token') },
});

type Deps = { cards?: CardsStore; widget?: WidgetStore; reviewNow?: () => Date };

// The widget shows hard words only (Hamid, 2026-11-25). The plan is kept so the next call can count the slots that passed.
export function widgetRoutes(deps: Deps) {
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>();
  return app.openapi(getPlan, async (c) => {
    if (!deps.cards?.widgetWords || !deps.widget) throw new Error('widget stores are not set');
    const now = deps.reviewNow ? deps.reviewNow() : new Date();
    const userId = c.get('user').id;
    const [hard, kept] = await Promise.all([deps.cards.widgetWords(userId), deps.widget.get(userId)]);
    const counted = countPassed(kept ?? emptyState(now), now);
    // Only words that are still hard keep their looks.
    const looks = Object.fromEntries(hard.filter((h) => counted.looks[h.id] !== undefined).map((h) => [h.id, counted.looks[h.id]!]));
    const plan = makePlan(hard.map((h) => ({ cardId: h.id, word: h.word, translation: h.translation, createdAt: h.createdAt, looks: looks[h.id] ?? 0 })), now, c.req.header('X-Time-Zone'));
    await deps.widget.save(userId, { slots: plan.slots.map(({ at, end, cardId, newLap }) => ({ at, end, cardId, ...(newLap ? { newLap } : {}) })), looks, countedUntil: now });
    return c.json({ slots: plan.slots.map((s) => ({ at: s.at.toISOString(), cardId: s.cardId, word: s.word, translation: s.translation, look: s.look })), endsAt: plan.endsAt?.toISOString() ?? null }, 200);
  });
}

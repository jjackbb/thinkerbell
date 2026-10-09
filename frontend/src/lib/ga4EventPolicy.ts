import type { EventName } from './events';
import { ANALYTICS_SCREENS, analyticsSurfaceBlocked } from './analyticsSurface';
import { getAnalyticsControl } from './analyticsControls';
import { ANALYTICS_OPERATIONS } from './analyticsOperations';

// General UI and fixed task outcomes are eligible. Sensitive surfaces/controls
// and arbitrary operation names remain fail-closed.
const CORE_TASK_EVENTS = new Set<EventName>([
  'story_view',
  'story_publish_success',
  'vote_submit',
  'vote_change_success',
  'comment_create_success',
  'ai_entry_click',
  'ai_mode_select',
  'ai_start_select',
  'ai_settings_confirm',
  'ai_chat_open',
  'ai_chat_turn1',
  'ai_chat_turn3',
  'ai_chat_finish',
  'ai_feedback_view',
  'ai_feedback_submit',
]);

export function shouldSendToGA4(name: EventName, props: Record<string, unknown>): boolean {
  if (analyticsSurfaceBlocked()) return false;
  if (name === 'page_view') return typeof props.screen === 'string' && ANALYTICS_SCREENS.has(props.screen);
  if (name === 'ui_click') {
    const control = getAnalyticsControl(props.button_id);
    return !!control && !control.excluded && typeof props.screen === 'string' && ANALYTICS_SCREENS.has(props.screen);
  }
  if (['operation_start', 'operation_success', 'operation_error', 'operation_cancelled', 'action_blocked'].includes(name)) {
    return typeof props.operation === 'string' && ANALYTICS_OPERATIONS.has(props.operation);
  }
  return CORE_TASK_EVENTS.has(name);
}

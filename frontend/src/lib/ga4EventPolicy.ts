import type { EventName } from './events';

// Only the agreed core task funnel and confirmed save outcomes go to GA4.
// Authentication, account, report and crisis-support behavior stays out.
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
  if (name === 'operation_success' || name === 'operation_error') {
    return props.operation === 'ai_reply_save';
  }
  return CORE_TASK_EVENTS.has(name);
}

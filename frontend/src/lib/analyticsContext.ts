/** Only fixed categories enter analytics; query strings and user input never do. */
export type AnalyticsEntryPoint = 'feed' | 'weekly_top' | 'my_page' | 'story_detail' | 'shared_link' | 'chat_list' | 'chat_return';
export type ConversationType = 'new' | 'continuation';
export type RecruitmentSource = 'community' | 'sns' | 'technical_test' | 'unattributed';
export const RECRUITMENT_STORAGE_KEY = 'nipyeon_recruitment_source_v1';

export function recruitmentSource(value: unknown): RecruitmentSource {
  return value === 'community' || value === 'sns' ? value : value === 'qa' ? 'technical_test' : 'unattributed';
}

/** Called only after analytics consent. Session persistence ends on refusal. */
export function readRecruitmentSource(): RecruitmentSource {
  const params = new URLSearchParams(location.search);
  let source = recruitmentSource(params.get('source'));
  try {
    if (!params.has('source')) {
      const saved = sessionStorage.getItem(RECRUITMENT_STORAGE_KEY);
      source = saved === 'community' || saved === 'sns' || saved === 'technical_test' ? saved : 'unattributed';
    }
    sessionStorage.setItem(RECRUITMENT_STORAGE_KEY, source);
  } catch { /* A blocked storage area must not prevent events or app use. */ }
  return source;
}

const screens: Record<string, string> = {
  story_view: 'story_detail', vote_submit: 'story_detail', vote_change_success: 'story_detail',
  comment_create_success: 'story_detail', story_publish_success: 'story_editor',
  ai_entry_click: 'story_detail', ai_mode_select: 'ai_mode_selection',
  ai_start_select: 'ai_mode_selection', ai_settings_confirm: 'ai_settings',
  ai_chat_open: 'ai_chat', ai_chat_turn1: 'ai_chat', ai_chat_turn3: 'ai_chat',
  ai_chat_finish: 'ai_chat', ai_feedback_view: 'ai_feedback', ai_feedback_submit: 'ai_feedback',
  operation_success: 'ai_chat', operation_error: 'ai_chat',
};
const entryPoints = new Set(['feed', 'weekly_top', 'my_page', 'story_detail', 'shared_link', 'chat_list', 'chat_return']);

export function safeEventProps(name: string, props: Record<string, unknown>): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = { event_schema_version: 3 };
  if (screens[name]) result.screen = screens[name];
  if (typeof props.entry_point === 'string' && entryPoints.has(props.entry_point)) result.entry_point = props.entry_point;
  if (name === 'ai_entry_click' && props.entry_point === 'my_page') result.screen = 'my_page';
  if (props.conversation_type === 'new' || props.conversation_type === 'continuation') result.conversation_type = props.conversation_type;
  if (props.mode === 'simulation' || props.mode === 'explanation') result.mode = props.mode;
  if (props.operation === 'ai_reply_save') result.operation = props.operation;
  if (props.error_code === 'save_failed') result.error_code = props.error_code;
  if (props.outcome === 'completed' || props.outcome === 'submitted' || props.outcome === 'skipped') result.outcome = props.outcome;
  return result;
}

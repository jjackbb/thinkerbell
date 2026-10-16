import { ANALYTICS_SCREENS } from './analyticsSurface';
import { getAnalyticsControl } from './analyticsControls';
import { ANALYTICS_OPERATIONS } from './analyticsOperations';
/** Only fixed categories enter analytics; query strings and user input never do. */
export type AnalyticsEntryPoint = 'feed' | 'weekly_top' | 'my_page' | 'story_detail' | 'shared_link' | 'chat_list' | 'chat_return';
export type ConversationType = 'new' | 'continuation';
export type RecruitmentSource = 'community' | 'sns' | 'meta' | 'technical_test' | 'unattributed';
export const RECRUITMENT_STORAGE_KEY = 'nipyeon_recruitment_source_v1';
export type CampaignAttribution = {
  recruitment_source: RecruitmentSource;
  campaign_code?: 'launch_202610';
  creative_code?: 'a' | 'b';
};

export function recruitmentSource(value: unknown): RecruitmentSource {
  return value === 'community' || value === 'sns' || value === 'meta' ? value : value === 'qa' ? 'technical_test' : 'unattributed';
}

/** These are operator-owned codes, never free-form names, UTM values or ad IDs. */
export function campaignAttribution(source: unknown, campaign: unknown, creative: unknown): CampaignAttribution {
  const result: CampaignAttribution = { recruitment_source: recruitmentSource(source) };
  if (result.recruitment_source === 'meta' && campaign === 'launch_202610') {
    result.campaign_code = 'launch_202610';
    if (creative === 'a' || creative === 'b') result.creative_code = creative;
  }
  return result;
}

/** Consent-only callers. Reuses the existing tab-session source storage. */
export function readCampaignAttribution(): CampaignAttribution {
  const params = new URLSearchParams(location.search);
  let result = campaignAttribution(params.get('source'), params.get('campaign'), params.get('creative'));
  try {
    if (!params.has('source')) {
      const saved = sessionStorage.getItem(RECRUITMENT_STORAGE_KEY);
      // Backward compatibility with previously saved single-category values.
      if (saved === 'technical_test') result = { recruitment_source: 'technical_test' };
      else if (saved === 'community' || saved === 'sns' || saved === 'meta') result = { recruitment_source: saved };
      else if (saved) {
        try {
          const parsed = JSON.parse(saved);
          result = campaignAttribution(parsed?.recruitment_source === 'technical_test' ? 'qa' : parsed?.recruitment_source,
            parsed?.campaign_code, parsed?.creative_code);
        } catch { /* Invalid saved metadata is untrusted. */ }
      }
    }
    sessionStorage.setItem(RECRUITMENT_STORAGE_KEY, JSON.stringify(result));
  } catch { /* A blocked storage area must not prevent events or app use. */ }
  return result;
}

export function readRecruitmentSource(): RecruitmentSource {
  return readCampaignAttribution().recruitment_source;
}

/** Navigation may carry only fixed public codes; it never persists analytics. */
export function campaignLinkParams(source: unknown, search: string = typeof location === 'undefined' ? '' : location.search): URLSearchParams {
  const input = new URLSearchParams(search);
  const safe = campaignAttribution(source, input.get('campaign'), input.get('creative'));
  const output = new URLSearchParams();
  if (safe.recruitment_source !== 'unattributed') output.set('source', safe.recruitment_source === 'technical_test' ? 'qa' : safe.recruitment_source);
  if (safe.campaign_code) output.set('campaign', safe.campaign_code);
  if (safe.creative_code) output.set('creative', safe.creative_code);
  return output;
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
  const result: Record<string, string | number | boolean> = { event_schema_version: 4 };
  if (screens[name]) result.screen = screens[name];
  if (typeof props.entry_point === 'string' && entryPoints.has(props.entry_point)) result.entry_point = props.entry_point;
  if (name === 'ai_entry_click' && props.entry_point === 'my_page') result.screen = 'my_page';
  if (props.conversation_type === 'new' || props.conversation_type === 'continuation') result.conversation_type = props.conversation_type;
  if (props.mode === 'simulation' || props.mode === 'explanation') result.mode = props.mode;
  if (typeof props.screen === 'string' && ANALYTICS_SCREENS.has(props.screen)) result.screen = props.screen;
  const control = getAnalyticsControl(props.button_id);
  if (name === 'ui_click' && control && !control.excluded) {
    result.button_id = props.button_id as string;
    result.element_type = control.kind;
  }
  if (typeof props.operation === 'string' && ANALYTICS_OPERATIONS.has(props.operation)) result.operation = props.operation;
  if (props.error_code === 'save_failed' || props.error_code === 'unconfirmed') result.error_code = props.error_code;
  if (name === 'action_blocked' && typeof props.reason === 'string' && ['auth_required', 'validation', 'busy', 'limit', 'not_ready', 'unchanged'].includes(props.reason)) result.reason = props.reason;
  if (props.outcome === 'completed' || props.outcome === 'submitted' || props.outcome === 'skipped') result.outcome = props.outcome;
  return result;
}

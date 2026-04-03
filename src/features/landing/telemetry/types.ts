import type {AppLocale} from '@/config/site';

export type TelemetryConsentState = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';

export type TelemetryEventType =
  | 'landing_view'
  | 'card_answered'
  | 'attempt_start'
  | 'final_submit';

export interface TelemetryBaseEvent {
  event_type: TelemetryEventType;
  event_id: string;
  session_id: string | null;
  ts_ms: number;
  locale: AppLocale;
  route: string;
  consent_state: TelemetryConsentState;
}

export interface LandingViewTelemetryEvent extends TelemetryBaseEvent {
  event_type: 'landing_view';
}

export interface CardAnsweredTelemetryEvent extends TelemetryBaseEvent {
  event_type: 'card_answered';
  source_variant: string;
  target_route: string;
  landing_ingress_flag: true;
}

export interface AttemptStartTelemetryEvent extends TelemetryBaseEvent {
  event_type: 'attempt_start';
  variant: string;
  question_index_1based: number;
  dwell_ms_accumulated: number;
  landing_ingress_flag: boolean;
}

export interface FinalSubmitTelemetryEvent extends TelemetryBaseEvent {
  event_type: 'final_submit';
  variant: string;
  question_index_1based: number;
  dwell_ms_accumulated: number;
  landing_ingress_flag: boolean;
  final_responses: Record<string, 'A' | 'B'>;
}

export type TelemetryEvent =
  | LandingViewTelemetryEvent
  | CardAnsweredTelemetryEvent
  | AttemptStartTelemetryEvent
  | FinalSubmitTelemetryEvent;

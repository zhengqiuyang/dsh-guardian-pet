import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "dsh-guardian-pet";
export declare const inject: string[];
export interface Config {
    /** Path of the trust-panel event log (read/egress live events persist there). */
    panelEventsPath: string;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;

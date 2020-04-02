import { UserCommandScope } from "./user";
import { Snowflake } from "discord.js";

/**
 * Scope where a command can be used
 */
export type CommandScope = UserCommandScope | Snowflake;
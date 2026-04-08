import type {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  PermissionResolvable,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import type { BotClient } from "./index";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | ContextMenuCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction, client: BotClient) => Promise<void>;
  permissions?: PermissionResolvable[];
}

export interface TicketData {
  channelId: string;
  userId: string;
  guildId: string;
  service?: string;
  createdAt: Date;
  claimedBy?: string;
  closed?: boolean;
}

export interface GuildConfig {
  guildId: string;
  logsChannelId?: string;
  ticketCategoryId?: string;
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  autoRoleId?: string;
  suggestChannelId?: string;
  protectEnabled?: boolean;
  antiSpamEnabled?: boolean;
  antiRaidEnabled?: boolean;
  antiBotEnabled?: boolean;
  antiLinkEnabled?: boolean;
  antiMassMentionEnabled?: boolean;
  whitelist?: string[];
  staffRoleId?: string;
}

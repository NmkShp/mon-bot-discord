import type { TicketData, GuildConfig } from "./types";

const tickets = new Map<string, TicketData>();
const guildConfigs = new Map<string, GuildConfig>();
const spamTracker = new Map<string, { count: number; lastMsg: number }>();
const raidTracker = new Map<string, { joins: number; lastJoin: number }>();
const actionTracker = new Map<string, { count: number; last: number }>();

export const store = {
  tickets,
  guildConfigs,
  spamTracker,
  raidTracker,
  actionTracker,

  getConfig(guildId: string): GuildConfig {
    if (!guildConfigs.has(guildId)) {
      guildConfigs.set(guildId, {
        guildId,
        protectEnabled: true,
        antiSpamEnabled: true,
        antiRaidEnabled: true,
        antiBotEnabled: true,
        antiLinkEnabled: false,
        antiMassMentionEnabled: true,
        whitelist: [],
      });
    }
    return guildConfigs.get(guildId)!;
  },

  setConfig(guildId: string, config: Partial<GuildConfig>) {
    const current = this.getConfig(guildId);
    guildConfigs.set(guildId, { ...current, ...config });
  },

  createTicket(channelId: string, data: Omit<TicketData, "channelId">) {
    tickets.set(channelId, { ...data, channelId });
  },

  getTicket(channelId: string): TicketData | undefined {
    return tickets.get(channelId);
  },

  closeTicket(channelId: string) {
    const ticket = tickets.get(channelId);
    if (ticket) {
      ticket.closed = true;
      tickets.set(channelId, ticket);
    }
  },
};

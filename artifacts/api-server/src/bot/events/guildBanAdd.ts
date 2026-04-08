import { type GuildBan } from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { sendLog, securityLogEmbed } from "../utils/logger";

export async function handleGuildBanAdd(ban: GuildBan, client: BotClient) {
  const config = store.getConfig(ban.guild.id);
  if (!config.protectEnabled || !config.antiRaidEnabled) return;

  const key = `ban-${ban.guild.id}`;
  const now = Date.now();
  const entry = store.actionTracker.get(key) || { count: 0, last: now };

  if (now - entry.last < 10000) {
    entry.count++;
  } else {
    entry.count = 1;
    entry.last = now;
  }
  entry.last = now;
  store.actionTracker.set(key, entry);

  if (entry.count >= 3) {
    const embed = securityLogEmbed(
      "⚠️ Anti-Ban Massif",
      `**${entry.count}** bans ont été effectués en moins de 10 secondes !\n` +
        `Dernier banni : **${ban.user.tag}**\n` +
        `Vérifiez si un compte admin a été compromis.`
    );
    await sendLog(ban.guild, embed);
  }
}

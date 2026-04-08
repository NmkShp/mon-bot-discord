import { type DMChannel, type NonThreadGuildBasedChannel } from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { sendLog, securityLogEmbed } from "../utils/logger";

export async function handleChannelDelete(
  channel: DMChannel | NonThreadGuildBasedChannel,
  client: BotClient
) {
  if (!("guild" in channel) || !channel.guild) return;

  const config = store.getConfig(channel.guild.id);
  if (!config.protectEnabled) return;

  const key = `chanDelete-${channel.guild.id}`;
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
      "⚠️ Anti-Suppression Massive de Salons",
      `**${entry.count}** salons ont été supprimés en moins de 10 secondes !\n` +
        `Dernier salon supprimé : **${channel.name}**\n` +
        `Vérifiez vos permissions et votre serveur.`
    );
    await sendLog(channel.guild, embed);
  }
}

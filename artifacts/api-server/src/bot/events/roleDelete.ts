import { type Role } from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { sendLog, securityLogEmbed } from "../utils/logger";

export async function handleRoleDelete(role: Role, client: BotClient) {
  const config = store.getConfig(role.guild.id);
  if (!config.protectEnabled) return;

  const key = `roleDelete-${role.guild.id}`;
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
      "⚠️ Anti-Suppression Massive de Rôles",
      `**${entry.count}** rôles ont été supprimés en moins de 10 secondes !\n` +
        `Dernier rôle supprimé : **${role.name}**\n` +
        `Vérifiez vos permissions et votre serveur.`
    );
    await sendLog(role.guild, embed);
  }
}

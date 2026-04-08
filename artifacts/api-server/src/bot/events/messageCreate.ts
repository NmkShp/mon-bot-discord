import { type Message, Colors, EmbedBuilder } from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { sendLog, securityLogEmbed } from "../utils/logger";

const MALICIOUS_LINK_REGEX =
  /(https?:\/\/)?(www\.)?(discord\.gg|discordapp\.com\/invite|bit\.ly|tinyurl|grabify|iplogger)/i;

export async function handleMessageCreate(message: Message, client: BotClient) {
  if (message.author.bot || !message.guild) return;

  const config = store.getConfig(message.guild.id);
  if (!config.protectEnabled) return;

  const whitelist = config.whitelist || [];
  if (whitelist.includes(message.author.id)) return;

  // Anti-spam
  if (config.antiSpamEnabled) {
    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    const entry = store.spamTracker.get(key) || { count: 0, lastMsg: now };

    if (now - entry.lastMsg < 3000) {
      entry.count++;
    } else {
      entry.count = 1;
    }
    entry.lastMsg = now;
    store.spamTracker.set(key, entry);

    if (entry.count >= 5) {
      try {
        await message.delete();
        const embed = securityLogEmbed(
          "Anti-Spam",
          `**${message.author.tag}** (\`${message.author.id}\`) a été détecté comme spammer.\n` +
            `**${entry.count}** messages en moins de 3 secondes.`
        );
        await sendLog(message.guild, embed);

        // Timeout for 10 minutes
        const member = await message.guild.members.fetch(message.author.id);
        await member.timeout(10 * 60 * 1000, "Anti-spam automatique");
        entry.count = 0;
        store.spamTracker.set(key, entry);
      } catch {
        // No permission
      }
      return;
    }
  }

  // Anti-mass mention
  if (config.antiMassMentionEnabled && message.mentions.users.size >= 5) {
    try {
      await message.delete();
      const embed = securityLogEmbed(
        "Anti-Mass Mention",
        `**${message.author.tag}** a mentionné **${message.mentions.users.size}** utilisateurs dans un seul message.`
      );
      await sendLog(message.guild, embed);

      const member = await message.guild.members.fetch(message.author.id);
      await member.timeout(5 * 60 * 1000, "Anti-mass mention automatique");
    } catch {
      // No permission
    }
    return;
  }

  // Anti-link
  if (config.antiLinkEnabled && MALICIOUS_LINK_REGEX.test(message.content)) {
    try {
      await message.delete();
      const embed = securityLogEmbed(
        "Anti-Lien",
        `**${message.author.tag}** a envoyé un lien suspect :\n\`${message.content.substring(0, 200)}\``
      );
      await sendLog(message.guild, embed);

      if ("send" in message.channel) {
        await (message.channel as any).send({
          embeds: [
            new EmbedBuilder()
              .setColor(Colors.Red)
              .setDescription(`❌ ${message.author}, les liens externes ne sont pas autorisés ici.`),
          ],
        });
      }
    } catch {
      // No permission
    }
  }
}

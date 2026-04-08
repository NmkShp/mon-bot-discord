import {
  type ButtonInteraction,
  EmbedBuilder,
  Colors,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { sendLog } from "../utils/logger";
import { errorEmbed, successEmbed } from "../utils/embeds";

export async function handleTicketButtons(interaction: ButtonInteraction, client: BotClient) {
  const id = interaction.customId;

  if (id === "ticket_close") {
    await handleClose(interaction);
  } else if (id === "ticket_claim") {
    await handleClaim(interaction);
  } else if (id === "ticket_transcript") {
    await handleTranscript(interaction, client);
  }
}

async function handleClose(interaction: ButtonInteraction) {
  const ticket = store.getTicket(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed("Erreur", "Ce salon n'est pas un ticket.")], ephemeral: true });
    return;
  }

  if (ticket.closed) {
    await interaction.reply({ embeds: [errorEmbed("Erreur", "Ce ticket est déjà fermé.")], ephemeral: true });
    return;
  }

  const guild = interaction.guild!;
  const config = store.getConfig(guild.id);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(Colors.Orange)
        .setTitle("🔒 Fermeture du ticket")
        .setDescription("Ce ticket sera supprimé dans **5 secondes**...")
        .setTimestamp(),
    ],
  });

  const logEmbed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle("🎫 Ticket Fermé")
    .addFields(
      { name: "Fermé par", value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
      { name: "Salon", value: `#${interaction.channel && "name" in interaction.channel ? interaction.channel.name : "ticket"}`, inline: true }
    )
    .setTimestamp();
  await sendLog(guild, logEmbed);

  store.closeTicket(interaction.channelId);

  setTimeout(async () => {
    try {
      await interaction.channel?.delete();
    } catch {
      // Already deleted
    }
  }, 5000);
}

async function handleClaim(interaction: ButtonInteraction) {
  const ticket = store.getTicket(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed("Erreur", "Ce salon n'est pas un ticket.")], ephemeral: true });
    return;
  }

  if (ticket.claimedBy) {
    await interaction.reply({
      embeds: [errorEmbed("Déjà réclamé", `Ce ticket a déjà été pris en charge par <@${ticket.claimedBy}>`)],
      ephemeral: true,
    });
    return;
  }

  ticket.claimedBy = interaction.user.id;
  store.tickets.set(interaction.channelId, ticket);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(Colors.Green)
        .setTitle("✋ Ticket Réclamé")
        .setDescription(`${interaction.user} prend en charge ce ticket !`)
        .setTimestamp(),
    ],
  });
}

async function handleTranscript(interaction: ButtonInteraction, client: BotClient) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || !("messages" in channel)) {
    await interaction.editReply({ content: "❌ Impossible de générer une transcription." });
    return;
  }

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = [...messages.values()].reverse();

    const transcript = sorted
      .map(
        (m) =>
          `[${m.createdAt.toLocaleString("fr-FR")}] ${m.author.tag}: ${m.content || "[Embed/Attachment]"}`
      )
      .join("\n");

    const config = store.getConfig(interaction.guild!.id);
    if (config.logsChannelId) {
      const logsChannel = await interaction.guild!.channels.fetch(config.logsChannelId);
      if (logsChannel && logsChannel.isTextBased() && "send" in logsChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📄 Transcription de Ticket")
          .setDescription(`Ticket: ${channel && "name" in channel ? `#${channel.name}` : "ticket"}\n\`\`\`\n${transcript.substring(0, 3800)}\n\`\`\``)
          .setTimestamp();
        await logsChannel.send({ embeds: [embed] });
      }
    }

    await interaction.editReply({
      content: `✅ La transcription a été envoyée dans le salon des logs !\n\nPremiers messages :\n\`\`\`\n${transcript.substring(0, 800)}\n\`\`\``,
    });
  } catch {
    await interaction.editReply({ content: "❌ Impossible de générer la transcription." });
  }
}

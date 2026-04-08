import {
  type ButtonInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
} from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";
import { ticketEmbed } from "../utils/embeds";
import { sendLog } from "../utils/logger";

export async function handleTicketCreate(interaction: ButtonInteraction, client: BotClient) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const user = interaction.user;
  const config = store.getConfig(guild.id);

  // Check for existing open ticket
  const existingTicket = [...store.tickets.values()].find(
    (t) => t.userId === user.id && t.guildId === guild.id && !t.closed
  );

  if (existingTicket) {
    await interaction.editReply({
      content: `❌ Tu as déjà un ticket ouvert : <#${existingTicket.channelId}>`,
    });
    return;
  }

  try {
    const ticketNum = store.tickets.size + 1;
    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: client.user!.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
    ];

    // Add staff role permissions if configured
    if (config.staffRoleId) {
      permissionOverwrites.push({
        id: config.staffRoleId,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages,
        ],
      });
    }

    const channelOptions: Parameters<typeof guild.channels.create>[0] = {
      name: `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}-${ticketNum}`,
      type: ChannelType.GuildText,
      permissionOverwrites,
      ...(config.ticketCategoryId ? { parent: config.ticketCategoryId } : {}),
    };

    const channel = await guild.channels.create(channelOptions);

    store.createTicket(channel.id, {
      userId: user.id,
      guildId: guild.id,
      createdAt: new Date(),
    });

    // Select menu for service
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_service_select")
      .setPlaceholder("Sélectionne un service...")
      .addOptions([
        { label: "🚀 Nitro Boost", value: "Nitro Boost", description: "Service de Nitro Boost" },
        { label: "💎 Server Boost", value: "Server Boost", description: "Service de Server Boost" },
        { label: "🎨 Graphisme", value: "Graphisme", description: "Création graphique" },
        { label: "👤 Comptes (ACC)", value: "Comptes", description: "Vente / achat de comptes" },
        { label: "👥 Membres", value: "Membres", description: "Service de membres" },
        { label: "🔧 Tools", value: "Tools", description: "Outils & services" },
        { label: "❓ Questions / Support", value: "Support", description: "Questions & aide" },
        { label: "📌 Autre", value: "Autre", description: "Autre demande" },
      ]);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const closeBtn = new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Fermer")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒");

    const claimBtn = new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Claim")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✋");

    const transcriptBtn = new ButtonBuilder()
      .setCustomId("ticket_transcript")
      .setLabel("Transcription")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📄");

    const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      closeBtn,
      claimBtn,
      transcriptBtn
    );

    const embed = ticketEmbed();
    embed.addFields({
      name: "Ouvert par",
      value: `${user} (\`${user.tag}\`)`,
      inline: true,
    });

    await channel.send({
      content: `${user} Bienvenue dans ton ticket !`,
      embeds: [embed],
      components: [selectRow, btnRow],
    });

    await interaction.editReply({
      content: `✅ Ton ticket a été créé : ${channel}`,
    });

    // Log
    const logEmbed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setTitle("🎫 Ticket Créé")
      .addFields(
        { name: "Utilisateur", value: `${user} (\`${user.tag}\`)`, inline: true },
        { name: "Salon", value: `${channel}`, inline: true }
      )
      .setTimestamp();
    await sendLog(guild, logEmbed);
  } catch (err) {
    await interaction.editReply({
      content: "❌ Impossible de créer le ticket. Vérifie mes permissions.",
    });
  }
}

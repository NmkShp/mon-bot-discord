import { type StringSelectMenuInteraction, EmbedBuilder, Colors } from "discord.js";
import type { BotClient } from "../index";
import { store } from "../store";

const QUESTIONS: Record<string, string[]> = {
  "Nitro Boost": [
    "Quel type de boost veux-tu ? (Nitro Classic ou Nitro)",
    "Quel est ton budget ?",
    "Quel est le délai souhaité ?",
    "Des informations supplémentaires ?",
  ],
  "Server Boost": [
    "Combien de boosts souhaites-tu ?",
    "Quel est ton budget ?",
    "Quel est l'ID de ton serveur ?",
    "Des informations supplémentaires ?",
  ],
  Graphisme: [
    "Quel type de graphisme souhaites-tu ? (logo, bannière, avatar...)",
    "Quel est ton budget ?",
    "Quel est le délai souhaité ?",
    "Décris ton projet en détail :",
  ],
  Comptes: [
    "Quel type de compte recherches-tu ?",
    "Quel est ton budget ?",
    "Des exigences spécifiques ?",
    "Des informations supplémentaires ?",
  ],
  Membres: [
    "Combien de membres souhaites-tu ?",
    "Quel type de membres ? (actifs, bots...)",
    "Quel est ton budget ?",
    "Des informations supplémentaires ?",
  ],
  Tools: [
    "Quel outil ou service recherches-tu ?",
    "Quel est ton budget ?",
    "Quel est le délai souhaité ?",
    "Des informations supplémentaires ?",
  ],
  Support: [
    "Quelle est ta question ou ton problème ?",
    "As-tu essayé des solutions ? Si oui, lesquelles ?",
    "Des informations supplémentaires ?",
  ],
  Autre: [
    "Quel service ou aide recherches-tu ?",
    "Quel est ton budget (si applicable) ?",
    "Quel est le délai souhaité ?",
    "Des informations supplémentaires ?",
  ],
};

export async function handleTicketSelect(
  interaction: StringSelectMenuInteraction,
  client: BotClient
) {
  const service = interaction.values[0];
  const ticket = store.getTicket(interaction.channelId);
  if (!ticket) return;

  ticket.service = service;
  store.tickets.set(interaction.channelId, ticket);

  await interaction.update({ components: [] });

  const questions = QUESTIONS[service] || QUESTIONS["Autre"];

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📋 Service sélectionné : ${service}`)
    .setDescription(
      "Merci d'avoir sélectionné un service !\n\n" +
        "Veuillez répondre aux questions suivantes pour que nous puissions mieux vous aider :\n\n" +
        questions.map((q, i) => `**${i + 1}.** ${q}`).join("\n")
    )
    .setFooter({ text: "Répondez à ces questions dans le chat pour continuer" })
    .setTimestamp();

  const ch = interaction.channel;
  if (ch && "send" in ch) {
    await ch.send({ embeds: [embed] });
  }
}

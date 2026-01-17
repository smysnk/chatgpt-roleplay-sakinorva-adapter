import { extractResultMetadata } from "@/lib/runMetadata";
import { initializeInteractionModel, Interaction } from "@/lib/models/Interaction";

let upgradePromise: Promise<void> | null = null;

const shouldUpdateScores = (scores: Record<string, number> | null) => !scores || !Object.keys(scores).length;

export const runRunUpgrades = async () => {
  if (!upgradePromise) {
    upgradePromise = (async () => {
      initializeInteractionModel();
      const interactions = await Interaction.findAll();
      const updates = interactions.map(async (interaction) => {
        if (!interaction.resultsHtmlFragment || !shouldUpdateScores(interaction.functionScores)) {
          return;
        }
        const metadata = extractResultMetadata(interaction.resultsHtmlFragment);
        if (!Object.keys(metadata.functionScores).length) {
          return;
        }
        await interaction.update({ functionScores: metadata.functionScores });
      });
      await Promise.all(updates);
    })();
  }
  await upgradePromise;
};

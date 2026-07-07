import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Recipe } from '../types';
import { buildRecipeHtml } from './recipeHtml';

export { buildRecipeHtml } from './recipeHtml';

/**
 * Generate a PDF of the recipe and hand it to the user.
 * - Web: opens the browser print dialog (Save as PDF).
 * - Native: writes a PDF file and opens the share sheet (Save to Files, etc.).
 */
export async function exportRecipePdf(recipe: Recipe): Promise<void> {
  const html = buildRecipeHtml(recipe);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${recipe.name} — recipe`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}

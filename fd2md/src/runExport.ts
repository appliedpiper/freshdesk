import {
  exportFreshdesk,
  exportArticleMap,
  importArticleMap,
  updateInternalLinks,
} from "#/exportFreshdesk";

async function main() {
  try {
    // Export Freshdesk articles to markdown files
    // let articleMap = new Map<number, ArticleMapEntry>();
    console.log("Starting Freshdesk export...");
    let articleMap = await exportFreshdesk();


    // Generate a JSON article map for all exported articles (ID, Path, Title, Updated At)
    await exportArticleMap(articleMap);

    // Check to see if the article map exists from current export
    if (articleMap.size === 0) {
      // If not, import the article map from the JSON file
      articleMap = await importArticleMap();
    }

    // Update the internal markdown links
    await updateInternalLinks(articleMap);
    console.log("Export complete!");

  } catch (error) {
    console.error("Fatal error during export:", error);
    process.exit(1);
  }
}

main();
import env from '#/lib/env';

import TurndownService from 'turndown';
import axios from 'axios';
import pLimit from 'p-limit';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import fs from 'fs-extra';
import path from 'path';

// ////////////////////////////////////////////////
// Environment variables
// ////////////////////////////////////////////////
const API_KEY = env.API_KEY;
const DOMAIN = env.DOMAIN;

// ///////////////////////////////////////////////
// Local Output Directories
// ///////////////////////////////////////////////
const MD_OUTPUT_DIR = env.MD_OUTPUT_DIR;
const IMAGE_DIR = env.IMAGE_DIR;

// ///////////////////////////////////////////////
// Services and utilities initialization
// ///////////////////////////////////////////////

// Initialize Turndown Service for HTML to Markdown conversion
const turndown = new TurndownService();

// Axios instance with Freshdesk API credentials
const api = axios.create({
  baseURL: `https://${DOMAIN}/api/v2`,
  auth: {
    username: API_KEY,
    password: "X",
  },
});

// Enable concurrency control with p-limit
// to avoid overwhelming the API or network

// Article processing limit
const articleLimit = pLimit(3);
// Image Download Limit
const imageLimit = pLimit(3);

// ////////////////////////////////////////////////
// Freshdesk Solution Article types
// ////////////////////////////////////////////////
// Solution Articles are organized in a hierarchy of
// Categories > Folders > Articles

// Freshdesk Category structure
interface Category {
  id: number;
  name: string;
  // description: string;
  // created_at: string;
  // updated_at: string;
}

// Freshdesk Folder structure
interface Folder {
  id: number;
  name: string;
  category_id: number;   // Parent category ID
  // articles_count: number; // Number of articles in this folder
  // created_at: string;
  // updated_at: string;
}

// Freshdesk Article structure
interface Article {
  id: number;
  title: string;
  description: string;
  category_id: number;
  folder_id: number;
  created_at: string;
  updated_at: string;
}

// Structure to track article IDs
interface ArticleMapEntry {
  path: string;
  title: string;
  updated_at: string;
}

// ////////////////////////////////////////////////
// Article Map Functions
// ////////////////////////////////////////////////
// Map to track article IDs and their corresponding local file paths
// This will be used to rewrite internal links after all articles are processed

// Function to export the article map to a JSON file
// Useful for debugging and periodic backups
async function exportArticleMap(articleMap: Map<number, ArticleMapEntry>) {
  // Temp Record to convert Map to Object for JSON serialization
  const mapObject: Record<number, ArticleMapEntry> = {};
  
  // Restructure the Map Entries by Article ID for easier lookup
  for (const [id, entry] of articleMap.entries()) {
    mapObject[id] = entry;
  }

  const outputPath = path.join(MD_OUTPUT_DIR, "articleMap.json");

  // Write the article map to a JSON file with 2 space formatting
  await fs.writeJson(outputPath, mapObject, { spaces: 2 });
  // console.log(`Article map exported to ${outputPath}`);
}

// Function to import the article map from a JSON file
// This allows us to preserve article ID to file path mappings across runs
async function importArticleMap(): Promise<Map<number, ArticleMapEntry>> {
  const filePath = path.join(MD_OUTPUT_DIR, "articleMap.json");
  // Load the article map from the JSON file
  const data = await fs.readJson(filePath);

  return new Map(
    Object.entries(data).map(([id, value]) => [
      Number(id),
      value as ArticleMapEntry,
    ])
  );
}

// ////////////////////////////////////////////////
// Remove special characters and spaces
// ///////////////////////////////////////////////
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\d]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ////////////////////////////////////////////////
// Utility functions
// ////////////////////////////////////////////////

// Function to update internal links to local markdown files
async function updateInternalLinks(articleMap: Map<number, ArticleMapEntry>) {
  // Map<ArticleID, LocalFilePath>
  const files = await fs.readdir(MD_OUTPUT_DIR, { recursive: true, encoding: "utf-8", });

  for (const file of files) {
    // Skip files that are not markdown
    if (!file.endsWith(".md")) continue;

    
    // Read the markdown file content
    const fileFullPath = path.join(MD_OUTPUT_DIR, file);
    console.log(`Updating Local Links: ${fileFullPath}`);
    let fileContent = await fs.readFile(fileFullPath, "utf-8");

    // Replace internal links with the correct local paths
    fileContent = fileContent.replace(/https?:\/\/[^\s]+\/solutions\/articles\/(\d+)/g,
      (match, articleIdStr) => {
        // articleId is the 1st capture group from the URL (\d+)
        // convert the articleIdStr to a number 
        const articleId = Number(articleIdStr);
        const targetPath = articleMap.get(articleId)?.path;

        if (!targetPath) return match;  // Return the original URL, if no mapping is found

        // Convert the targetPath to a relative path
        const relativePath = path.relative(
          path.dirname(fileFullPath),
          path.join(MD_OUTPUT_DIR, targetPath)
        );
  
        return relativePath.replace(/\\/g, "/"); // Normalize Windows paths
      }
    );
    await fs.writeFile(fileFullPath, fileContent);
  }
}

// Function to validate and normalize URLs
function validateAndNormalizeUrl(
  src: string | undefined,
  domain: string
): string | null {
  // Exit if the url is empty
  if (!src) return null;

  let url = src.trim();

  // If the URL is relative, prepend the domain
  if (url.startsWith("/")) {
    url = `https://${domain}${url}`;
  }

  // Validate the URL format
  try {
    // Force URL parsing to check validity
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    console.warn(`Invalid URL skipped: ${src}`);
    return null;
  }
}
// Structure to track image processing results
type ImageTaskResult =
  | { img: any; action: "replace"; localPath: string }
  | { img: any; action: "invalid"; src: string }
  | { img: any; action: "missing"; src: string };

// Function to update image attributes in the HTML content
function updateImageAttributes($: CheerioAPI, imageResults: ImageTaskResult[]) {
  for (const result of imageResults) {
    if (result.action === "replace") {
      $(result.img).attr("src", result.localPath);
    } else if (result.action === "invalid") {
      console.warn(`Skipping invalid image URL: ${result.src}`);
      $(result.img).replaceWith(`[Invalid Image URL: ${result.src}]`);
    } else if (result.action === "missing") {
      console.warn(`Image skipped due to download failure: ${result.src}`);
      $(result.img).replaceWith(`[Image Missing: ${result.src}]`);
    }
  }
}

// Function to download an image from a URL and save it locally
async function downloadImage(url: string, folder: string): Promise<string | null> {
  try {
    // Extract the filename from the URL and create a local path
    const parsed = new URL(url);
    const filename = path.basename(parsed.pathname);
    const localPath = path.join(folder, IMAGE_DIR, filename);
    await fs.ensureDir(path.dirname(localPath));

    // Download the image and save it to the local path
    const response = await axios({
      url,
      responseType: "stream",
      timeout: 10000, // 10 seconds timeout for image download
    });

    await new Promise((resolve, reject) => {
      const stream = response.data.pipe(fs.createWriteStream(localPath));
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    return `${IMAGE_DIR}/${filename}`;
  } catch (err: any) {
    console.warn(`Failed to download image: ${url}`);
    console.warn(`Error: ${err.message}`);
    return null;
  }
}

// Function to process an individual article
// 1) download images
// 2) convert to markdown
// 3) save locally
async function processArticle(article: Article, folderPath: string): Promise<ArticleMapEntry> {
  const $ = cheerio.load(article.description);
  
  // Article images are stored in the description field as <img> tags
  const images = $("img").toArray();

  // Download each image from the article and save it locally
  const imageTasks: Promise<ImageTaskResult>[] = images.map((img) =>
    imageLimit(async () => {
      // Extract image URL
      const src = $(img).attr("src") ?? "";

      // Validate and normalize the image URL
      const normalizedUrl = validateAndNormalizeUrl(src, DOMAIN);
      if (!normalizedUrl) {
        // Avoiding DOM updates in aync loop to prevent conflicts
        // Update all the image URLs after downloaded
        return {
          img,
          action: "invalid",
          src
        };
      }

      // Download the image and get the local path
      const localPath = await downloadImage(normalizedUrl, folderPath);

      // Update the image src to point to the local path
      if (localPath) {
        // Update the img tag's src attribute to the local path
        return {
          img,
          action: "replace",
          localPath
        };
      } else {
        // Image failed to download
        // Explicitly state the missing URL
        return {
          img,
          action: "missing",
          src
        };
      }
    })
  );
  const imageResults = await Promise.all(imageTasks);
  updateImageAttributes($, imageResults);


  // Convert the article's HTML content to markdown
  const markdown = turndown.turndown($.html());
  
  // Save the article content as a markdown file
  const filename = `${slugify(article.title)}.md`;
  const filePath = path.join(folderPath, filename);

  // Set the article ID and path in articleMap for updating urls
  // Regex Replace Normalizes markdown links (important on Windows)
  const relativeFilePath = path.relative(MD_OUTPUT_DIR, filePath).replace(/\\/g, "/");

  // Prepend the article title as an H1 header
  const content = `# ${article.title}

${markdown}
`;

  await fs.writeFile(filePath, content);

  // Return the article map entry for this article
  return {
    path: relativeFilePath,
    title: article.title,
    updated_at: article.updated_at
  }
}
// ////////////////////////////////////////////////
// Main Export Function
// ////////////////////////////////////////////////
async function exportFreshdesk(): Promise<Map<number, ArticleMapEntry>> {
  // Active article map to track article IDs and their corresponding local file paths
  const newMap = new Map<number, ArticleMapEntry>();

  // Load the existing article map from the JSON file if it exists
  const existingMap = await importArticleMap().catch(() => new Map<number, ArticleMapEntry>());
  
  try {
    const categories = (await api.get<Category[]>("/solutions/categories")).data;
    // /////////////////////////////////////////////
    // Category Loop
    // /////////////////////////////////////////////
    for (const category of categories) {
      // Create a valid directory name by slugifying the category name
      const categorySlug = slugify(category.name);
      const categoryPath = path.join(MD_OUTPUT_DIR, categorySlug);

      // Create the category directory if it doesn't exist
      await fs.ensureDir(categoryPath);

      // Fetch folders for the category
      const folders = (await api.get<Folder[]>(`/solutions/categories/${category.id}/folders`)).data;

      // /////////////////////////////////////////////
      // Folder Loop
      // /////////////////////////////////////////////
      // Potential Optimization: MultiThreaded folder processing with p-limit
      // Some Freshdesk plans limit the number of API calls per minute
      // Not sure on ROI of this optimization, Suspect Article processing is the main bottleneck
      for (const folder of folders) {
        const folderSlug = slugify(folder.name);
        const folderPath = path.join(categoryPath, folderSlug);

        await fs.ensureDir(folderPath);

        const articles = (await api.get<Article[]>(`/solutions/folders/${folder.id}/articles`)).data;

        if (!articles.length) {
          console.log(`Skipping empty folder: ${category.name} / ${folder.name}`);
          continue;
        }

        // /////////////////////////////////////////////
        // Article Loop
        // /////////////////////////////////////////////
        // for (const article of articles) {
        const articleTasks = articles.map(article =>
          articleLimit(async () => {
            const existingArticle = existingMap.get(article.id);

            // If the article exists in the existing map 
            // and the updated_at timestamp is the same, skip processing
            if (existingArticle && existingArticle.updated_at === article.updated_at) {
              console.log(`Skipping unchanged article: ${category.name} / ${folder.name} / ${article.title}`);
              // Store the existing article entry in the articleMap to preserve it for link updating
              newMap.set(article.id, existingArticle);
              return;
            }

            console.log(`Exporting: ${category.name} / ${folder.name} / ${article.title}`);
            const articleEntry = await processArticle(article, folderPath);

            // Store the article ID and article contents in the articleMap 
            newMap.set(article.id, articleEntry);
          })
        );
        await Promise.all(articleTasks);
      }
    }
    console.log("SUCCESS: Export complete");

  } catch (err: any) {

    const fullUrl = err.config
      ? `${err.config.baseURL || ""}${err.config.url || ""}`
      : "Unknown URL";

    if (err.response) {
      console.error("API ERROR");
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
      console.error("URL:", fullUrl);

    } else {
      console.error("REQUEST ERROR");
      console.error("Message:", err.message);
      console.error("URL:", fullUrl);
    }

  }
  return newMap;
}

// // Export Freshdesk articles to markdown files
// // let articleMap = new Map<number, ArticleMapEntry>();
// let articleMap = await exportFreshdesk();


// // Generate a JSON article map for all exported articles (ID, Path, Title, Updated At)
// await exportArticleMap(articleMap);

// // Check to see if the article map exists from current export
// if (articleMap.size === 0) {
//   // If not, import the article map from the JSON file
//   articleMap = await importArticleMap();
// }

// // Update the internal markdown links
// await updateInternalLinks(articleMap);
# Freshdesk Article Exporter

A TypeScript utility for exporting Freshdesk Solution Articles to local Markdown files.

The exporter preserves the Freshdesk hierarchy:

```text
Category/
└── Folder/
    └── Article.md
```

It also downloads article images locally, converts internal Freshdesk article links to local Markdown links, and maintains an article map to support incremental exports.

## Features

* Export Freshdesk Solution Articles to Markdown
* Preserve Category and Folder structure
* Download and locally reference article images
* Convert HTML content to Markdown
* Rewrite links between Freshdesk articles
* Skip unchanged articles using `updated_at`
* Process articles and images concurrently
* Handle invalid or missing images without stopping the export

## Requirements

* Node.js
* pnpm
* Freshdesk API access

## Installation

Install dependencies:

```bash
pnpm install
```

## Configuration

Create a `.env` file in the project root:

```env
API_KEY=freshdesk_api_key_here
DOMAIN=yourcompany.freshdesk.com
MD_OUTPUT_DIR=/path/to/output/directory
IMAGE_DIR=images
```

| Variable | Description |
| --- | --- |
| `API_KEY` | Freshdesk API key |
| `DOMAIN` | Freshdesk domain |
| `MD_OUTPUT_DIR` | Root directory for exported Markdown files |
| `IMAGE_DIR` | Directory used for downloaded images |

The Freshdesk API uses the API key as the username and `X` as the password.

## Usage

Run the exporter:

```bash
pnpm export
```

The export process:

1. Retrieves Categories, Folders, and Articles from Freshdesk.
2. Creates the corresponding local directory structure.
3. Downloads article images.
4. Converts article HTML to Markdown.
5. Writes the Markdown files.
6. Creates or updates `articleMap.json`.
7. Updates internal Freshdesk article links.

## Output

Example output:

```text
output/
├── category_1/
│   ├── folder_1/
│   │   ├── article_one.md
│   │   └── images/
│   │       ├── image001.png
│   │       └── image002.jpg
│   └── folder_2/
│       └── article_two.md
├── category_2/
│   └── folder_3/
│       └── article_three.md
└── articleMap.json
```

## Incremental Exports

The exporter stores each article's Freshdesk ID, local path, title, and `updated_at` timestamp in `articleMap.json`.

On subsequent exports, an article is skipped when its Freshdesk `updated_at` timestamp matches the value in the existing article map.

This allows subsequent exports to complete significantly faster than a full export.

## Internal Links

Links to other Freshdesk articles are converted to relative links to the corresponding local Markdown files.

For example:

```text
https://yourcompany.freshdesk.com/en/support/solutions/articles/64000271010
```

becomes a local Markdown path such as:

```text
../license-management/how_to_update_the_license_server.md
```

## Image Handling

Images referenced by an article are downloaded into the article's local image directory.

Invalid URLs or failed downloads do not stop the export. The affected image is replaced with a visible marker such as:

```text
[Image Missing: https://example.com/image.jpg]
```

This makes broken images easy to identify and correct later.

## Testing

The project uses Vitest.

Run the tests:

```bash
pnpm test
```

Run tests with verbose output:

```bash
pnpm test:debug
```

## Build

Compile the TypeScript project:

```bash
pnpm build
```

## Available Commands

| Command | Description |
| --- | --- |
| `pnpm export` | Export Freshdesk articles |
| `pnpm test` | Run the test suite |
| `pnpm test:debug` | Run tests with verbose output |
| `pnpm build` | Build the TypeScript project |

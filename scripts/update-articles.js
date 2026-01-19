import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSS_URL = 'https://medium.com/feed/@renhehuang0723';
const OUTPUT_FILE = path.join(__dirname, '../src/data/articles.json');

async function fetchArticles() {
    try {
        console.log(`Fetching RSS feed from ${RSS_URL}...`);
        const response = await fetch(RSS_URL);
        if (!response.ok) throw new Error(`Failed to fetch RSS: ${response.statusText}`);

        const xml = await response.text();
        const items = parseRSS(xml);

        if (items.length > 0) {
            // Read existing tags to preserve them if possible, though RSS doesn't give us custom tags easily
            // We will extract categories from RSS as tags

            const articles = items.map(item => {
                // Extract first image from content if available
                const imgMatch = item['content:encoded']?.match(/<img[^>]+src="([^">]+)"/);
                const image = imgMatch ? imgMatch[1] : null;

                // Clean up description/summary (remove HTML tags)
                const summary = item['content:encoded']
                    ? item['content:encoded'].replace(/<[^>]+>/g, '').substring(0, 150) + '...'
                    : item.description || '';

                return {
                    id: item.guid,
                    title: item.title,
                    summary: summary,
                    link: item.link,
                    date: new Date(item.pubDate).toISOString().split('T')[0], // YYYY-MM-DD
                    tags: item.categories || ['AI', 'Tech'],
                    image: image,
                    readingTime: '5' // Estimate or default
                };
            });

            console.log(`Found ${articles.length} articles.`);

            const jsonContent = JSON.stringify(articles, null, 4);
            fs.writeFileSync(OUTPUT_FILE, jsonContent);
            console.log(`Updated ${OUTPUT_FILE}`);
        } else {
            console.log('No articles found in RSS feed.');
        }

    } catch (error) {
        console.error('Error updating articles:', error);
        process.exit(1);
    }
}

function parseRSS(xml) {
    const items = [];
    // Simple regex-based XML parser for RSS items
    // This is lightweight to avoid adding xml2js dependency

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];
        const item = {};

        // Extract basic fields
        item.title = extractTag(itemContent, 'title', true); // CDATA aware
        item.link = extractTag(itemContent, 'link');
        item.guid = extractTag(itemContent, 'guid');
        item.pubDate = extractTag(itemContent, 'pubDate');
        item.description = extractTag(itemContent, 'description', true);
        item['content:encoded'] = extractTag(itemContent, 'content:encoded', true);

        // Extract categories (multiple tags)
        const categoryRegex = /<category>(.*?)<\/category>/g;
        let catMatch;
        item.categories = [];
        while ((catMatch = categoryRegex.exec(itemContent)) !== null) {
            const cat = catMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
            if (cat) item.categories.push(cat);
        }

        items.push(item);
    }

    return items;
}

function extractTag(xml, tagName, isCData = false) {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
    const match = xml.match(regex);
    if (match) {
        let content = match[1];
        if (isCData) {
            const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
            if (cdataMatch) return cdataMatch[1];
        }
        return content.trim();
    }
    return null;
}

fetchArticles();

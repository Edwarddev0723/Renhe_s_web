import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../src/data/models.json');
const AUTHOR = 'renhehuang';
const MODELS_API = `https://huggingface.co/api/models?author=${AUTHOR}&full=true`;
const DATASETS_API = `https://huggingface.co/api/datasets?author=${AUTHOR}&full=true`;

async function fetchModels() {
    try {
        console.log(`Fetching models for ${AUTHOR}...`);

        const [modelsRes, datasetsRes] = await Promise.all([
            fetch(MODELS_API),
            fetch(DATASETS_API)
        ]);

        if (!modelsRes.ok) throw new Error(`Failed to fetch models: ${modelsRes.statusText}`);
        if (!datasetsRes.ok) throw new Error(`Failed to fetch datasets: ${datasetsRes.statusText}`);

        const modelsData = await modelsRes.json();
        const datasetsData = await datasetsRes.json();

        const models = modelsData.map(item => ({
            id: item.modelId.split('/')[1],
            name: item.modelId.split('/')[1],
            type: 'model',
            task: item.pipeline_tag ? formatTask(item.pipeline_tag) : 'Other',
            size: 'Unknown', // API usage for size is complex, keeping simple for now or manual override could be better, but let's leave it simple
            downloads: item.downloads,
            likes: item.likes,
            link: `https://huggingface.co/${item.modelId}`,
            lastUpdated: new Date(item.lastModified).toISOString().split('T')[0]
        }));

        const datasets = datasetsData.map(item => ({
            id: item.id.split('/')[1],
            name: item.id.split('/')[1],
            type: 'dataset',
            rows: 'Unknown', // Similar to size, hard to get without specific metadata
            downloads: item.downloads,
            likes: item.likes,
            link: `https://huggingface.co/datasets/${item.id}`,
            lastUpdated: new Date(item.lastModified).toISOString().split('T')[0]
        }));

        // Sort by downloads descending
        const allItems = [...models, ...datasets].sort((a, b) => b.downloads - a.downloads);

        console.log(`Found ${models.length} models and ${datasets.length} datasets.`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 4));
        console.log(`Updated ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Error updating models:', error);
        process.exit(1);
    }
}

function formatTask(task) {
    if (!task) return 'Other';
    return task.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

fetchModels();

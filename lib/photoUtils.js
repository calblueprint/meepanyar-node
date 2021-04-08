const { BlobServiceClient } = require('@azure/storage-blob');

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const AZURE_STORAGE_CONTAINER_NAME = 'photos';
const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);

// Function uploads the given blob with the given filename and returns the URL for it
export async function uploadBlob(blobName, blobString) {
    try {
        // Regex was taken from https://stackoverflow.com/a/39590768
        const matches = blobString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const blobHttpHeaders = {
            blobContentType: type
        };

        await blockBlobClient.upload(buffer, buffer.length, { blobHttpHeaders });
        const blobURL = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobName}`;
        return blobURL

    } catch (err) {
        console.log(err);
        throw Error("Unable to upload blob")
    }
}

export async function deleteBlob(blobName) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    blockBlobClient.deleteIfExists().then(console.log);
}

// Generate a filename with the format YYYY-MM-RANDOM#
export function generateFileName() {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const randomNumber = Math.random();
    return `${year}-${month}-${randomNumber}`;
}
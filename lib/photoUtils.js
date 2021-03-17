const atob = require('atob');
const azure = require('azure-storage');
const blobService = azure.createBlobService();

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_CONTAINER_NAME = 'photos';

// Function uploads the given blob with the given filename and returns the URL for it
export async function uploadBlobAndCreateSummary(blobName, blobString) {
    try {
        // Regex was taken from https://stackoverflow.com/a/39590768
        const matches = blobString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        await blobService.createBlockBlobFromText(AZURE_STORAGE_CONTAINER_NAME, blobName, buffer, {
            contentType: type,
        }, (error, result, response) => {
            if (error) {
                console.log(error);
                throw Error("Unable to upload blob from text");
            }
        });

        const bankSlipURL = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobName}`;
        return bankSlipURL

    } catch (err) {
        console.log(err);
        throw Error("Unable to upload blob")
    }
}
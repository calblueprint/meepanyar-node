const { BlobServiceClient, ContainerSASPermissions } = require('@azure/storage-blob')
import { createFinancialSummarie } from '../airtable/request';

const atob = require('atob');

const azure = require('azure-storage');
const blobService = azure.createBlobService();

export function dataURIToBuffer(dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to an ArrayBuffer
    let arrayBuffer = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    let bufferView = new Uint8Array(arrayBuffer);

    // set the bytes of the buffer to the correct values
    for (var i = 0; i < byteString.length; i++) {
        bufferView[i] = byteString.charCodeAt(i);
    }

    return arrayBuffer;

}


// Function uploads the given blob with the given filename and returns the URL for it
export async function uploadBlobAndCreateSummary(blobName, blobString) {

    try {
        // Regex was taken from https://stackoverflow.com/a/39590768
        let matches = blobString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const type = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        let bankSlipURL = ''
        await blobService.createBlockBlobFromText('bankslips', blobName, buffer, {
            contentType: type,
        }, async function (error, result, response) {

            if (!error) {
                console.log("Blob uploaded");
                bankSlipURL = `https://meepanyar.blob.core.windows.net/bankslips/${blobName}`

                let financialSummaryPayload = {
                }

                if (bankSlipURL) {
                    financialSummaryPayload.bankSlip = [
                        { url: bankSlipURL }
                    ]
                }
                const financialSummaryId = await createFinancialSummarie(financialSummaryPayload);
            } else {
                console.log("Inside else")
                console.log("Error occurred while uploading image");
                console.log(error);
            }
        })
    } catch (err) {
        console.log(err);
        throw Error("Unable to upload blob")
    }
}
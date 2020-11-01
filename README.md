# meepanyar-node

_Last updated: November 1st, 2020 (by Julian)_

This repo is home to the server-side code for Blueprint's Mee Panyar Project. For the client-side analgous to this repo, follow [this](https://github.com/calblueprint/meepanyar) link.

## Local Setup
1. Make a copy of the `.env.example` file and rename the copy to be `.env`.
2. Fill out the `.env` file with the relevant information. Some are already filled out for you.
    1. You can find the Mee Panyar airtable base ID at: https://airtable.com/api if you have access to the base.
    2. You can generate an Airtable API key on the accounts page of airtable https://airtable.com/account
    3. You do not need to touch anything fields other than the ones that ask for your BASE_ID and API_KEY
3. Generate public and private RSA keys and place them in the config folder.
    1. Starting in the `meepanyar-node` folder, 
    2. run `cd config`
    3. Generate a private key into a file `jwt.key` by running `openssl genrsa -out jwt.key 2048` 
    4. Generate the corresponding public key into a file `jwt.key.pub` by running `openssl rsa -in jwt.key -outform PEM -pubout -out jwt.key.pub`
4. Run `npm install` to install all the necessary packages (bazel, airlock, etc...)

## Running Locally

To run this repo locally, make sure to first follow the steps in local setup. After, you can start the server (defaulted to run on localhost:4000) by running `npm start` while in the root directory `meepanyar-node`.

Your terminal should respond with: `info: 🚀 Airlock mounted and running on port 4000`

## Potentially Useful
- Airlock is set to run on `localhost:4000` by default. You can specify another port for Airlock to run on by specifying a `PORT` variable in `.env` (example: `PORT=5000`)
- Airlock is set to accept the origin `localhost:3000` which is the default port that the react development server runs on. If you are sending requests to airlock from a different port (which can happen if you are using production builds that run on `localhost:5000`), you may add origins to the `allowedOrigins` to whitelist them.
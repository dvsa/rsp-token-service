# RSP Payment Token Service
#### The below environment variables should be acquired and set locally for the API to run correctly:
ENCRYPTION_PASSWORD - This is the key used to encrypt and decrypt the token.
- This can be set in a .env file at the root level of the project.

#### Pre-requisites
Although Serverless Framework is being used solely for local development purposes, you still need a `[default]` AWS profile in `~/.aws/credentials` in order for for you to run the app locally.

#### Description
This API Will decrypt the payment token provided by the mobile application used by enforcement officers. It will also provide confirmation tokens to allow offline functionality.

### Running Locally

Set the right Node version (16.17)

`nvm use`

Install dependencies

`npm i`

Build and watch locally

`npm run start`

Create Open API docs

`npm run build-openapi`

Unit tests

`npm test`

Lint

`npm lint`

Auto fix lint

`npm lint-fix`

Building for release

- `npm run build:prod`

### Note 
SAM is a new addition and is being used for building for running locally and for packaging for production - using the `template.yaml` file.

Serverless is being used for running locally from the built files. Ideally SAM will be used for packaging and running locally going forward and the serverless config can be removed.

# RSP Payment Token Service
#### The below environment variables should be acquired and set locally for the API to run correctly:
ENCRYPTION_PASSWORD - This is the key used to encrypt and decrypt the token.
- This can be set in a .env file at the root level of the project.

#### Pre-requisites
Although Serverless Framework is being used solely for local development purposes, you still need a `[default]` AWS profile in `~/.aws/credentials` in order for for you to run the app locally.

#### Description
This API Will decrypt the payment token provided by the mobile application used by enforcement officers. It will also provide confirmation tokens to allow offline functionality.

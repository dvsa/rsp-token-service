# RSP Payment Token Decrypt
#### The below environment variables should be acquired and set locally for the API to run correctly:
ENCRYPTION_PASSWORD - This is the key used to encrypt and decrypt the token.

#### Pre-requisites
Although Serverless Framework is being used solely for local development purposes, you still need a `[default]` AWS profile in `~/.aws/credentials` in order for for you to run the app locally.

#### Description
This API decrypts the Hexadecimal token and attempts to parse it to the known data model for a penalty.

# RSP Payment Token Service

The service decrypts payment tokens. It has no database or persistent fixture
data. The configured local HTTP route is `POST /decrypt`; the deployed REST API
uses IAM authentication, while Serverless Offline disables authentication only
locally. Documents Service can also invoke the decrypt Lambda directly.

### Running locally

Use Node 24 (`nvm use`) and install the locked dependencies with `npm ci`.
`npm ci` replaces the existing `node_modules`. No Java, database, AWS login,
profile or private fixture is needed for this local path. Secrets Manager is
disabled by the local Serverless configuration.

For the synthetic requests in `bruno/`, start the service in a terminal:

```sh
npm run start
```

The build copies the root `.env` into `build/`, and Offline loads it through
`serverless-dotenv-plugin` and Node's `--env-file` (as in `rsp-documents-service`). If `ENCRYPTION_PASSWORD` is not set in `.env` or the
shell, the placeholder `password` is not a valid hex encryption password and
valid tokens will not decrypt. The Bruno tokens are synthetic test fixtures,
not production secrets. The HTTP API is at `http://localhost:3000/decrypt`; the
local Lambda endpoint defaults to port 3002. If those ports are occupied, run
`npm run offline -- --httpPort <port> --lambdaPort <port>` (after `npm run build`)
and update the Bruno URL to match. Stop the service with Ctrl+C.

Open `bruno/` as a collection in Bruno and run the synthetic payment and
missing-token requests against the local endpoint. The payment request returns
the exact reference, type and amount; the missing-token request returns 400.
These requests do not write data or call real AWS. They are **not** configured
for non-production; a real REST API call requires authorised SigV4 credentials
and environment-specific configuration. After credentials expire, renew them
and restart any process that captured them; this is not needed for local tests.

Run `npm test` for isolated unit tests and `npm run test:coverage` for the
same suite with original-source NYC/Babel instrumentation. The coverage gate is
95% per production file for statements, branches, functions and lines. HTML
output is in `coverage/index.html`. Coverage excludes tests and generated
files, not production modules; modules with no executable counters should not
be interpreted as separately tested behaviour. Unit tests block network access,
use synthetic AWS credentials and do not read `.env`. Put new v2 baseline tests
under `test/unit/`. Secrets Manager operations use SDK v3 and are mocked in
unit tests.

Run `npm run lint` for source linting and `npm run build-openapi` to generate
and validate `build/openapi.json`.

Known baseline limitations: malformed JSON in the decrypt request currently
throws rather than returning a normal validation response. The authorizer stub
returns Allow without checking its token; it is not wired as a local function
or route. Serverless Offline reports an existing warning about the HTTP API
`documentation` property in the earlier Node 20 baseline. A malformed Secrets
Manager `SecretString` now rejects bootstrap instead of throwing from an SDK v2
callback; no AWS call is made in local tests.

Dependency audit findings, including development dependencies, require review;
they are not fixed or waived by this upgrade. A fresh Snyk scan requires
appropriate scanner access. Do not deploy or merge on the assumption that it is
security-cleared: the existing default-branch workflow can update a
non-production Lambda. Updating repository runtime declarations does not update
the Lambda runtime in Terraform or AWS.

### Manual integration baseline

The integration suite runs separately from unit tests and CI. It uses synthetic
fixtures and starts its own loopback-only Serverless Offline HTTP and Lambda
emulators; it does not use a database, AWS login, private `.env` files or real
AWS resources. It refuses to run in CI and blocks non-loopback connections in
the emulator. It stops only the process it starts and removes its temporary
files; there are no persistent records to restore.

First run:

1. Select the service's Node version with `nvm use` and install the locked
   dependencies with `npm ci`. This replaces the existing `node_modules`.
2. Run `npm run build` to generate the local bundle and Serverless configuration
   under `build`. Rebuild after changing source.
3. Run `npm run test-i:tooling`, then `npm run test-i`.
4. Open `integration-results/latest.html`. The same results are available in
   `integration-results/latest.json`; both are ignored by Git and overwritten on
   the next run. The runner reports setup failures there too. Before an upgrade,
   save copies under different names to compare with the post-upgrade results.

The runner copies the local build to a temporary directory, substitutes the
synthetic unit-test password in that copy, disables Secrets Manager and uses
separate temporary ports. It does not modify the tracked local configuration or
read an existing service's environment. The handler executes on the installed
Node process, whose version appears in the report. Keep the `integration/` files in version control
to reproduce the baseline in another checkout.

The suite covers `POST /decrypt` and local direct Lambda proxy events. It also
builds the exported `auth` handler behind a test-only async adapter as a local
Lambda: that handler is not configured as a function or route in the service's
SAM or Serverless files. Serverless Offline timed out when the synchronous
handler was wired directly, so the adapter checks its returned policy but does
not verify native Lambda completion. The current stub returns an Allow policy
even when no token is supplied; this records existing behaviour, not a
recommendation. The local HTTP API does not reproduce the deployed REST API's
IAM authentication, and AWS Secrets Manager access remains untested. A passed
local suite is not proof of deployed behaviour or complete source coverage.

Auto-fix lint with `npm run lint-fix`. Build for release with
`npm run build:prod`; this writes `dist/decrypt.zip` and overwrites that archive
if it already exists. The archive contains its own bundled dependencies.

Webpack builds the Lambda using `lambdas.json`; SAM points at the generated
bundle. OSLS and Serverless Offline provide the local emulator. Actual AWS
infrastructure is managed separately through Terraform.

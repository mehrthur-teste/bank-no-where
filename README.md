# bank-no-where

# hashs
hashs.ts -> responsável por chat entre um solicitante e solicitador, ele passa chaves de autenticação epermissão e serve para chat.

# queries.ts
queries.ts -> responsável por o usuário e afins pegarem resultados donque aconteceu

# tunel.ts
tunel.ts -> é quando alguém consegue cobrar algo de vc, incrementar algo de vc e abrir um objeto sobre vc nele

# steps to install
nvm install 22.18.0
nvm use 22.18.0
cdk init app --language typescript
npm install
npm install aws-cdk-lib constructs
npm install --save-dev aws-cdk
npx cdk synth
export MY_VAR="-dev"
npx cdk deploy


# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

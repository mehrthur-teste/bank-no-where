import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs"
import  * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';



// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface ApiStackProps extends cdk.StackProps{
    hashHandler: lambdaNodejs.NodejsFunction
    queriesHandler: lambdaNodejs.NodejsFunction
    tunelHandler: lambdaNodejs.NodejsFunction
}

export class BankNoWhereStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    //Define logs
    const myVar = process.env.MY_VAR ?? '';
    const logGroupName = `/aws/lambda/bank-no-where-${myVar}`;
    const logGroup = new cwlogs.LogGroup(this, myVar, {
      logGroupName: logGroupName,
      retention: cwlogs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Define the first api Gateway for using with the queries
    const api = new apigateway.RestApi(this, "TunelApi", {
            restApiName: "TunelApi",
            cloudWatchRole: true,
            deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    caller: true,
                    user: true
                }),
                stageName: "prod"
            }
        })
        const tunelApiFetchIntegration = new  apigateway.LambdaIntegration(props.tunelHandler)
        const tunelResource = api.root.addResource("tunel")

        // Push tunell transactions
        const tunelLoginResource = tunelResource
                                               .addResource("push")
                                               .addResource("{login}")
                                               .addResource("password")
                                               .addResource("{password}");

        tunelLoginResource.addMethod("POST", tunelApiFetchIntegration)

    // Define the api Gateway web socket for using with the hash
    const QueriesWebSocketApi = new apigatewayv2.WebSocketApi(this, "QueriesWebSocket", {
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "ConnectIntegration",
          props.queriesHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          props.queriesHandler
        ),
      },
    });

    // Rota customizada para mensagens
    QueriesWebSocketApi.addRoute("sendMessage", {
      integration: new integrations.WebSocketLambdaIntegration(
        "SendMessageIntegration",
        props.queriesHandler
      ),
    });

    // Estágio do WebSocket
     new apigatewayv2.WebSocketStage(this, "QueriesWebSocketProd", {
      webSocketApi: QueriesWebSocketApi,
      stageName: "prod",
      autoDeploy: true,
    });


     // Define the api websocket for using with the hash
    const HashWebSocketApi = new apigatewayv2.WebSocketApi(this, "HashWebSocketApi", {
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "ConnectIntegration",
          props.queriesHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "DisconnectIntegration",
          props.queriesHandler
        ),
      },
    });

    // Rota customizada para mensagens
    HashWebSocketApi.addRoute("sendMessage", {
      integration: new integrations.WebSocketLambdaIntegration(
        "SendMessageIntegration",
        props.queriesHandler
      ),
    });

    // Estágio do WebSocket
    new apigatewayv2.WebSocketStage(this, "HashWebSocketApiProd", {
      webSocketApi: HashWebSocketApi,
      stageName: "prod",
      autoDeploy: true,
    });

    // Define the custom domain for the WebSocket API
    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'smarters.ai',
    });

    const apiCert = certificatemanager.Certificate.fromCertificateArn(this, 'ApiCert', 'arn:aws:acm:region:account:certificate/api-cert-arn');
    const queriesWsCert = certificatemanager.Certificate.fromCertificateArn(this, 'QueriesWsCert', 'arn:aws:acm:region:account:certificate/queries-ws-cert-arn');
    const hashWsCert = certificatemanager.Certificate.fromCertificateArn(this, 'HashWsCert', 'arn:aws:acm:region:account:certificate/hash-ws-cert-arn');

    // api gateway domain
    const apiDomain = new apigateway.DomainName(this, 'ApiDomain', {
    domainName: `${myVar}.smarters.ai`,
    certificate: apiCert,
    });

    new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
      domainName: apiDomain,
      restApi: api,
      stage: api.deploymentStage,
    });

    new route53.ARecord(this, 'ApiAliasRecord', {
      zone,
      recordName: `${myVar}.smarters.ai`,
      target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(apiDomain)),
    });

    // api websocket domain
    const queriesWsDomain = new apigatewayv2.DomainName(this, 'QueriesWsDomain', {
      domainName: `wsq-${myVar}.smarters.ai`,
      certificate: queriesWsCert,
    });

  const queriesWsStage = new apigatewayv2.WebSocketStage(this, "QueriesWebSocketProd", {
    webSocketApi: QueriesWebSocketApi,
    stageName: "prod",
    autoDeploy: true,
  });

  new apigatewayv2.ApiMapping(this, 'QueriesWsApiMapping', {
    domainName: queriesWsDomain,
    api: QueriesWebSocketApi,
    stage: queriesWsStage,
  });

  new route53.ARecord(this, 'QueriesWsAliasRecord', {
    zone,
    recordName: `wsq-${myVar}`,
    target: route53.RecordTarget.fromAlias(
    new targets.ApiGatewayv2DomainProperties(
      queriesWsDomain.regionalDomainName,
      queriesWsDomain.regionalHostedZoneId
    )
  ),
  });

  // other api websocket domain
  const hashWsDomain = new apigatewayv2.DomainName(this, 'HashWsDomain', {
    domainName: `wsh-${myVar}.smarters.ai`,
    certificate: hashWsCert,
  });

  const hashWsStage = new apigatewayv2.WebSocketStage(this, "QueriesWebSocketProd", {
    webSocketApi: HashWebSocketApi,
    stageName: "prod",
    autoDeploy: true,
  });

  new apigatewayv2.ApiMapping(this, 'HashWsApiMapping', {
    domainName: hashWsDomain,
    api: HashWebSocketApi,
    stage: hashWsStage,
  });

  new route53.ARecord(this, 'HashWsAliasRecord', {
    zone,
    recordName: `wsh-${myVar}`,
    target: route53.RecordTarget.fromAlias(
    new targets.ApiGatewayv2DomainProperties(
      hashWsDomain.regionalDomainName,
      hashWsDomain.regionalHostedZoneId
    )
  ),
  });



    


    // The code that defines your stack goes here
    // lambda/products/layers/productsLayer/nodejs/productsRepository
    // example resource
    // const queue = new sqs.Queue(this, 'BankNoWhereQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

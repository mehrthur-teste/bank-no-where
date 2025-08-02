import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs"
import  * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
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

    // The code that defines your stack goes here
    // lambda/products/layers/productsLayer/nodejs/productsRepository
    // example resource
    // const queue = new sqs.Queue(this, 'BankNoWhereQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}

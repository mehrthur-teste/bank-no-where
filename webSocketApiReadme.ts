import AWS from 'aws-sdk';

const ddb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  console.log("Event:", event);

  const { routeKey, connectionId, domainName, stage } = event.requestContext;
  const endpoint = `${domainName}/${stage}`;
  const apiGateway = new AWS.ApiGatewayManagementApi({ endpoint });

  if (routeKey === '$connect') {
    // Armazena nova conexão
    await ddb.put({
      TableName: 'Connections',
      Item: { connectionId }
    }).promise();
    return { statusCode: 200 };
  }

  if (routeKey === '$disconnect') {
    // Remove conexão
    await ddb.delete({
      TableName: 'Connections',
      Key: { connectionId }
    }).promise();
    return { statusCode: 200 };
  }

  if (routeKey === 'sendMessage') {
    const body = JSON.parse(event.body || '{}');
    const message = body.data;

    // Busca todos os connectionIds
    const connections = await ddb.scan({ TableName: 'Connections' }).promise();

    // Envia a mensagem para cada conexão
    const sendPromises = connections.Items.map(async ({ connectionId }) => {
      try {
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({ from: connectionId, message })
        }).promise();
      } catch (err) {
        if (err.statusCode === 410) {
          // Conexão expirada, remove do DynamoDB
          await ddb.delete({
            TableName: 'Connections',
            Key: { connectionId }
          }).promise();
        } else {
          console.error('Erro ao enviar:', err);
        }
      }
    });

    await Promise.all(sendPromises);
    return { statusCode: 200 };
  }

  return { statusCode: 400 };
};

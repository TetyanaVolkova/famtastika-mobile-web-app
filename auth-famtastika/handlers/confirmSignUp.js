// Import the required AWS Cognito SDK

const {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Initialize Cognito client with specified AWS region

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION, // Specify AWS region
});

// Define Cognito App Client ID for user pool authentication

const CLIENT_ID = process.env.CLIENT_ID;

exports.confirmSignUp = async (event) => {
  const { email, confirmationCode } = JSON.parse(event.body);
  const params = {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: confirmationCode,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    await client.send(command);

    // Return success response to client
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User successfully confirmed!" }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "confirmation failed",
        error: error.message,
      }),
    };
  }
};

// Import the required AWS Cognito SDK

const {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Initialize Cognito client with specified AWS region

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION, // Specify AWS region
});

// Define Cognito App Client ID for user pool authentication

// const CLIENT_ID = process.env.CLIENT_ID;

exports.signOut = async (event) => {
  const { accessToken } = JSON.parse(event.body);
  const params = {
    AccessToken: accessToken, // The access token from the sign in response
  };

  try {
    const command = new GlobalSignOutCommand(params);
    await client.send(command);

    // Return success response to client
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User successfully signed out!",
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "sign-out failed",
        error: error.message,
      }),
    };
  }
};

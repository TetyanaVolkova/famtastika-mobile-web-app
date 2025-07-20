// Import the required AWS Cognito SDK

const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Initialize Cognito client with specified AWS region

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION, // Specify AWS region
});

// Define Cognito App Client ID for user pool authentication

const CLIENT_ID = process.env.CLIENT_ID;

exports.signIn = async (event) => {
  // Parse the incoming request body to extract user data

  const { email, password } = JSON.parse(event.body);
  const params = {
    ClientId: CLIENT_ID,
    AuthFlow: "USER_PASSWORD_AUTH", // Auth flow for username/password
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await client.send(command);

    // Return success response to client
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User successfully signed in!",
        tokens: response.AuthenticationResult, // This will contain the AccessToken, RefreshToken, and IdToken
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "sign-in failed", error: error.message }),
    };
  }
};

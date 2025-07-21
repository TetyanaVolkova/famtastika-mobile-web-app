const UserModel = require("../models/UserModel");

// Import the required AWS Cognito SDK

const {
  CognitoIdentityProviderClient,
  SignUpCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// Initialize Cognito client with specified AWS region

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION, // Specify AWS region
});

// Define Cognito App Client ID for user pool authentication

const CLIENT_ID = process.env.CLIENT_ID;

// Exported sign-up function to handle new user registration

async function signUp(event) {
  // Parse the incoming request body to extract user data

  const { email, password, fullName, phoneNumber } = JSON.parse(event.body);

  // Configure parameters for Cognito SignupCommand

  const params = {
    ClientId: CLIENT_ID, // Cognito App Client Id
    Username: email, // User's email as username in Cognito
    PhoneNumber: phoneNumber, // User's phone number
    Password: password, // User's chosen password
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: fullName },
      { Name: "phone_number", Value: phoneNumber },
    ],
  };

  try {
    // Create a user in Cognito user pool
    const command = new SignUpCommand(params);
    // Execute the sign-up request
    await client.send(command);

    // Save user in DynamoDB after Cognito sign-in succeeds
    const newUser = new UserModel(email, fullName);
    await newUser.save();

    // Return success response to client
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Account successfully created, please verify your email!",
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "sign-up failed", error: error.message }),
    };
  }
}

module.exports = {
  signUp,
};

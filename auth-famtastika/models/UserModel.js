const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuid4 } = require("uuid");

const TABLE_NAME = "Users"; // DynamoDB table where users will be stored

// Initialize DynamoDb client with specified AWS region
const dynamoClient = new DynamoDBClient({
  region: "us-east-1", // AWS region where the Dynamodb table is located
});

// User Model class to represent a user and handle database operations
class UserModel {
  constructor(email, fullName) {
    this.userId = uuid4(); // Generate a unique user ID
    this.email = email; // Store the email of the user
    this.fullName = fullName; // Store the fullName of the user
    this.state = ""; // Default empty strung for state
    this.city = ""; // Default empty strung for city
    this.createdAt = new Date().toISOString(); // Store user creation timestamp
  }
  // Save user data to DynamoDB

  async save() {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId: { S: this.userId },
        email: { S: this.email },
        fullName: { S: this.fullName },
        state: { S: this.state },
        city: { S: this.city },
        createdAt: { S: this.createdAt },
      },
    };
    console.log(params);
    try {
      await dynamoClient.send(new PutItemCommand(params));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;

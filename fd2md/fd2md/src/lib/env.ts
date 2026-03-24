import * as dotenvFlow from 'dotenv-flow';
import { z } from "zod";

// Specify the .env file to generate TypeScript types for your environment variables
// dotenv.config({ path: "./.env.local" });

// Updated to use dotenv-flow to support multiple environments (e.g., .env.development, .env.production, etc.)
dotenvFlow.config();


// Declare the types for your ENV variables here:
const ENVSchema = z.object({
  API_KEY: z.string(),
  DOMAIN: z.string(),
  MD_OUTPUT_DIR: z.string(),
  IMAGE_DIR: z.string(),
});

export default ENVSchema.parse(process.env);
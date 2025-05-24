# Use a lightweight Node.js base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if exists) to the working directory
# This allows Docker to cache the npm install step if dependencies haven't changed
COPY package*.json ./

# Install project dependencies
# The 'ws' package is required for WebSocket functionality
RUN npm install

# Copy the rest of the application code to the working directory
# The main application file is assumed to be server.js based on previous context
COPY server.js .

# Copy the configuration and usage files if they exist
# These files will be created by the application if they don't exist,
# but copying them ensures persistence if the image is rebuilt with existing data.


# Expose the port that the Node.js server listens on
# This port (8080) is derived from the selected code snippet in your Node.js application.
EXPOSE 8080

# Define the command to run the application
# Node.js is run in ES module mode, so ensure your main file is .mjs or package.json has "type": "module"
CMD ["node", "app.js"]

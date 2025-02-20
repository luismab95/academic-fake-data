# Use the official Node.js image as the build stage
FROM node:22.13.0-bullseye AS build

# Copy all files from the current directory to /app in the container
COPY . /app
# Set the working directory to /app
WORKDIR /app

# Install dependencies
RUN yarn install --ignore-scripts


# Use a smaller Node.js image for the production stage
FROM node:22.13.0-slim AS production

RUN mkdir /app

# Create a non-root user and set permissions
RUN useradd --user-group --create-home --shell /bin/false appuser \
    && chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Copy the built application from the build stage
COPY --from=build /app/ ./app/


# Set the working directory to /dist
WORKDIR /app

# Expose port 3000
EXPOSE 3000

# Command to run the application
CMD ["yarn", "start"]



# Production Dockerfile using Bun
FROM oven/bun:1.1.20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --production

# Copy source code and config files
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose port and run production server
EXPOSE 3000
CMD ["bun", "run", "dev", "--host"]

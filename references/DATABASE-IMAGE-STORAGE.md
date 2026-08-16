# Database Image Storage Implementation

This document outlines the changes made to store images directly in PostgreSQL instead of the local filesystem.

## Overview

Images are now stored directly in the PostgreSQL database as binary data using a dedicated table structure. This approach eliminates the need for maintaining both local storage and cloud storage services, centralizing all data in a single location.

## Implementation Details

### Database Schema

A new table `imageStorage` was added to the database schema with the following structure:

- `id`: Serial primary key
- `data`: Text field storing base64-encoded image data
- `filename`: Original generated filename
- `originalName`: Original name of the uploaded file
- `mimetype`: MIME type of the image
- `size`: Size of the image in bytes
- `userId`: Foreign key to the user who uploaded the image (optional)
- `type`: Type of image (profile, background, etc.)
- `createdAt`: Timestamp of when the image was uploaded
- `updatedAt`: Timestamp of when the image was last updated

### Storage Service

A new service `dbImageStorage.ts` was implemented with the following functions:

- `saveImage`: Accepts a buffer and metadata, converts to base64, and stores in the database
- `getImage`: Retrieves an image by ID from the database
- `deleteImage`: Removes an image from the database by ID
- `getImagesByUser`: Retrieves all images uploaded by a specific user

### API Endpoints

The following API endpoints were added/modified:

- `POST /api/db-images/test-upload`: Test endpoint for uploading images (no auth required)
- `POST /api/db-images/upload`: Authenticated endpoint for uploading images
- `POST /api/db-images/public-upload`: Public endpoint for uploading images during registration
- `GET /api/db-images/:id`: Retrieve an image by ID
- `DELETE /api/db-images/:id`: Delete an image (only by the owner)

### Organization Logo Storage

The registration process now stores organization logos directly in the database:

1. The logo is uploaded using the `/api/db-images/public-upload` endpoint
2. The returned database image URL (in the format `/api/db-images/{id}`) is stored directly in the `logo` field of the organization record
3. The image can be accessed directly through this URL without further processing

### Multer Configuration Changes

- Changed from disk storage to memory storage
- File uploads are processed in memory and then stored directly in the database
- The same validation rules for file types and sizes are maintained

### Upload Endpoint Changes

The main `/upload` endpoint was modified to:

1. Use memory storage instead of disk storage
2. Save the uploaded file to the database after processing
3. Return database image URLs instead of filesystem paths

## Testing

A test script `test-db-image-upload.js` was created to verify the functionality:

- Uploads a test image to the database
- Retrieves the image to confirm it was stored correctly
- Compares content type and size to verify data integrity

## Benefits

- Centralized storage in the database
- Eliminated need for filesystem management
- Simplified deployment (no need for separate storage services)
- Improved data consistency and backup capabilities
- More secure access control through database mechanisms

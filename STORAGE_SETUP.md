# Supabase Storage Setup Guide

## 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `report-attachments`
   - **Public bucket**: ✅ Enable (so uploaded images are publicly accessible)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: Leave empty or add: `image/jpeg, image/png, image/gif, image/webp`

5. Click **Create bucket**

## 2. Set Bucket Policies (Optional - for more control)

If you want to restrict uploads to authenticated users only:

1. Go to **Storage** → **Policies**
2. Create a policy for the `report-attachments` bucket:

### Policy: Allow authenticated uploads
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-attachments');
```

### Policy: Public read access
```sql
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'report-attachments');
```

### Policy: Users can delete their own files
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'report-attachments' AND auth.uid() = owner);
```

## 3. Environment Variables

Make sure your `.env` file has the following Supabase configuration:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (optional, for admin operations)

# Database Configuration
SUPABASE_DB_HOST=db.your-project.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-db-password
SUPABASE_DB_NAME=postgres
```

## 4. Usage

### Upload an Image

**Endpoint**: `POST /upload`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Body** (form-data):
- `file`: (binary) - Your image file

**Response**:
```json
{
  "path": "uploads/uuid-timestamp.jpg",
  "publicUrl": "https://your-project.supabase.co/storage/v1/object/public/report-attachments/uploads/uuid-timestamp.jpg"
}
```

### Using the Uploaded Image in Reports

Once you get the response from the upload endpoint, use the `path` or `publicUrl` in your report/response payloads:

**Create Report with Image**:
```json
{
  "name": "Broken streetlight",
  "details": "The streetlight is not working",
  "attachment_path": "uploads/uuid-timestamp.jpg",
  "lat": 10.762622,
  "lng": 106.660172,
  "user_id": "user-uuid"
}
```

**Add Status Update with Image**:
```json
{
  "task_id": "task-uuid",
  "response_text": "Work in progress. Fixed the wiring.",
  "attachment_path": "uploads/uuid-timestamp.jpg"
}
```

## 5. Folder Structure

Images are organized by folder:
- `uploads/` - Default folder for all uploads
- `reports/` - (Future) For report attachments
- `responses/` - (Future) For status update attachments

You can modify the folder in the `StorageService.uploadFile()` method if needed.

## 6. File Validation

The upload endpoint validates:
- ✅ **File size**: Maximum 10MB
- ✅ **File types**: Only images (JPEG, PNG, GIF, WEBP)
- ✅ **Authentication**: Requires valid JWT token

## 7. Testing with Swagger

1. Start the application: `npm run start:dev`
2. Go to: http://localhost:3000/api
3. Authorize with your JWT token (click the lock icon)
4. Navigate to **App** → **POST /upload**
5. Click "Try it out"
6. Upload an image file
7. Copy the returned `path` or `publicUrl` to use in other endpoints

## Notes

- The service automatically generates unique filenames using UUID + timestamp
- Files are stored permanently until manually deleted
- Consider implementing a cleanup job for orphaned files (files not referenced in any report/response)

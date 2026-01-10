import { Controller, Get, Post, Delete, Body, Query, UseInterceptors, UploadedFiles, BadRequestException, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { StorageService, MultipleUploadResult } from './modules/storage/storage.service';
import { SupabaseAuthGuard } from './modules/auth/supabase-auth.guard';

@ApiTags('App')
@Controller()
export class AppController {
	constructor(
		private readonly appService: AppService,
		private readonly storageService: StorageService,
		private readonly dataSource: DataSource,
	) {}

	@Get('health')
	@ApiOperation({ summary: 'Basic health check' })
	getHealth(): { message: string; status: string; timestamp: string } {
		return this.appService.getBasicHealth();
	}

	@Get('health/db')
	@ApiOperation({ summary: 'Database health check - runs DB queries to keep connection alive' })
	async getDbHealth(): Promise<{ message: string; dbStatus: string; timestamp: string }> {
		return this.appService.getDbHealth(this.dataSource);
	}

	@Get('upload')
	@ApiBearerAuth('JWT-auth')
	@UseGuards(SupabaseAuthGuard)
	@ApiOperation({ summary: 'List files from Supabase Storage' })
	@ApiQuery({
		name: 'folder',
		required: false,
		description: 'Folder name to list files from (e.g., "reports", "responses")',
		example: 'uploads',
	})
	async listFiles(@Query('folder') folder?: string): Promise<{ files: Array<{ publicUrl: string; createdAt: string }> }> {
		return this.storageService.listFiles(folder || 'uploads');
	}

	@Post('upload')
	@ApiBearerAuth('JWT-auth')
	@UseGuards(SupabaseAuthGuard)
	@ApiOperation({ summary: 'Upload one or multiple images to Supabase Storage (1-5 files) - returns URLs array' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				files: {
					type: 'array',
					items: {
						type: 'string',
						format: 'binary',
					},
					description: 'Image file(s) (JPEG, PNG, GIF, WEBP) - 1 to 5 files, max 10MB each',
				},
				folder: {
					type: 'string',
					description: 'Optional folder name (e.g., "reports", "responses")',
					default: 'uploads',
				},
			},
			required: ['files'],
		},
	})
	@UseInterceptors(FilesInterceptor('files', 5))
	async uploadFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<MultipleUploadResult> {
		if (!files || files.length === 0) {
			throw new BadRequestException('No files uploaded');
		}

		// Default to 'uploads' folder
		const folder = 'uploads';

		const fileData = files.map((file) => ({
			buffer: file.buffer,
			filename: file.originalname,
		}));

		return this.storageService.uploadMultipleFiles(fileData, folder);
	}

	@Delete('upload')
	@ApiBearerAuth('JWT-auth')
	@UseGuards(SupabaseAuthGuard)
	@ApiOperation({ summary: 'Delete one or multiple images from Supabase Storage by URLs' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				urls: {
					type: 'array',
					items: {
						type: 'string',
					},
					description: 'Array of full public URLs of the images to delete',
					example: [
						'https://xxx.supabase.co/storage/v1/object/public/report-attachments/uploads/abc123.jpg',
						'https://xxx.supabase.co/storage/v1/object/public/report-attachments/uploads/def456.jpg',
					],
				},
			},
			required: ['urls'],
		},
	})
	async deleteFile(@Body('urls') urls: string[]): Promise<{ message: string; deletedCount: number; skipped?: string[] }> {
		if (!urls || urls.length === 0) {
			throw new BadRequestException('URLs array is required and cannot be empty');
		}

		const filePaths: string[] = [];
		const skippedUrls: string[] = [];

		// Extract file paths from all URLs
		for (const url of urls) {
			// Skip if url is not a string or is empty
			if (typeof url !== 'string' || !url || url.trim() === '') {
				skippedUrls.push(url || 'empty/invalid');
				continue;
			}

			try {
				// Extract the file path from the public URL
				// URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
				const urlParts = url.split('/storage/v1/object/public/');

				if (urlParts.length !== 2 || !urlParts[1]) {
					// Invalid format, skip this URL
					skippedUrls.push(url);
					continue;
				}

				const pathWithBucket = urlParts[1].trim();
				if (!pathWithBucket) {
					skippedUrls.push(url);
					continue;
				}

				const pathParts = pathWithBucket.split('/').filter((part) => part.length > 0);

				// Need at least bucket name and file path
				if (pathParts.length < 2) {
					skippedUrls.push(url);
					continue;
				}

				pathParts.shift(); // Remove bucket name
				const filePath = pathParts.join('/');

				if (filePath) {
					filePaths.push(filePath);
				} else {
					skippedUrls.push(url);
				}
			} catch (error) {
				// Catch any unexpected errors and skip this URL
				skippedUrls.push(url);
			}
		}

		// If no valid URLs were found, return early
		if (filePaths.length === 0) {
			throw new BadRequestException(
				'No valid Supabase storage URLs found. Expected format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}',
			);
		}

		// Delete all valid files
		await Promise.all(filePaths.map((filePath) => this.storageService.deleteFile(filePath)));

		const response: { message: string; deletedCount: number; skipped?: string[] } = {
			message: `Successfully deleted ${filePaths.length} file(s)`,
			deletedCount: filePaths.length,
		};

		// Include skipped URLs in response if any
		if (skippedUrls.length > 0) {
			response.skipped = skippedUrls;
			response.message += `, skipped ${skippedUrls.length} invalid URL(s)`;
		}

		return response;
	}
}

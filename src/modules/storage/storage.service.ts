import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface UploadResult {
	path: string;
	publicUrl: string;
}

@Injectable()
export class StorageService {
	private supabase: SupabaseClient;
	private bucketName: string;

	constructor(private configService: ConfigService) {
		const supabaseUrl = this.configService.get<string>('supabase.url');
		const supabaseKey = this.configService.get<string>('supabase.serviceRoleKey') || this.configService.get<string>('supabase.anonKey');

		if (!supabaseUrl || !supabaseKey) {
			throw new Error('Supabase configuration is missing');
		}

		this.supabase = createClient(supabaseUrl, supabaseKey);
		this.bucketName = this.configService.get<string>('supabase.storage.bucket') || 'report-attachments';
	}

	/**
	 * Upload a file to Supabase Storage
	 * @param file - File buffer to upload
	 * @param filename - Original filename
	 * @param folder - Optional folder path (e.g., 'reports', 'responses')
	 * @returns Upload result with path and public URL
	 */
	async uploadFile(file: Buffer, filename: string, folder: string = 'uploads'): Promise<UploadResult> {
		try {
			// Validate file size (max 10MB)
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (file.length > maxSize) {
				throw new BadRequestException('File size exceeds 10MB limit');
			}

			// Validate file type (images only)
			const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
			const fileExtension = this.getFileExtension(filename);
			const mimeType = this.getMimeType(fileExtension);

			if (!allowedMimeTypes.includes(mimeType)) {
				throw new BadRequestException('Only image files (JPEG, PNG, GIF, WEBP) are allowed');
			}

			// Generate unique filename
			const uniqueFilename = `${randomUUID()}-${Date.now()}${fileExtension}`;
			const filePath = `${folder}/${uniqueFilename}`;

			// Upload to Supabase Storage
			const { data, error } = await this.supabase.storage.from(this.bucketName).upload(filePath, file, {
				contentType: mimeType,
				upsert: false,
			});

			if (error) {
				console.error('Supabase upload error:', error);
				throw new InternalServerErrorException('Failed to upload file to storage');
			}

			// Get public URL
			const {
				data: { publicUrl },
			} = this.supabase.storage.from(this.bucketName).getPublicUrl(data.path);

			return {
				path: data.path,
				publicUrl,
			};
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}
			console.error('Upload error:', error);
			throw new InternalServerErrorException('Failed to upload file');
		}
	}

	/**
	 * Delete a file from Supabase Storage
	 * @param filePath - Path of the file to delete
	 */
	async deleteFile(filePath: string): Promise<void> {
		try {
			const { error } = await this.supabase.storage.from(this.bucketName).remove([filePath]);

			if (error) {
				console.error('Supabase delete error:', error);
				throw new InternalServerErrorException('Failed to delete file from storage');
			}
		} catch (error) {
			console.error('Delete error:', error);
			throw new InternalServerErrorException('Failed to delete file');
		}
	}

	/**
	 * Get public URL for a file
	 * @param filePath - Path of the file
	 * @returns Public URL
	 */
	getPublicUrl(filePath: string): string {
		const {
			data: { publicUrl },
		} = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);
		return publicUrl;
	}

	/**
	 * Get file extension from filename
	 */
	private getFileExtension(filename: string): string {
		const lastDot = filename.lastIndexOf('.');
		return lastDot !== -1 ? filename.substring(lastDot) : '';
	}

	/**
	 * Get MIME type from file extension
	 */
	private getMimeType(extension: string): string {
		const mimeTypes: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp',
		};
		return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
	}
}

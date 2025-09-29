import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpCode, ParseUUIDPipe, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto, UserResponseDto, PaginatedUserResponse } from '../../dto/user.dto';

@ApiTags('Users')
// @ApiBearerAuth() // Temporarily disabled for development - FIXME: Re-enable when auth is working
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@ApiOperation({
		summary: 'Get all users with pagination and filtering',
		description: 'Retrieve a paginated list of users with optional filtering by search term and role',
	})
	@ApiQuery({
		name: 'page',
		required: false,
		type: Number,
		description: 'Page number for pagination (default: 1)',
		example: 1,
	})
	@ApiQuery({
		name: 'limit',
		required: false,
		type: Number,
		description: 'Number of items per page (default: 10, max: 100)',
		example: 10,
	})
	@ApiQuery({
		name: 'search',
		required: false,
		type: String,
		description: 'Search term for username or email',
		example: 'john',
	})
	@ApiQuery({
		name: 'role',
		required: false,
		enum: ['user', 'staff', 'admin', 'superadmin'],
		description: 'Filter users by role',
		example: 'user',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Users retrieved successfully',
		type: PaginatedUserResponse,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid query parameters',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 400 },
				message: { type: 'array', items: { type: 'string' }, example: ['Page must be at least 1'] },
				error: { type: 'string', example: 'Bad Request' },
			},
		},
	})
	@Get()
	async findAll(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: UserQueryDto): Promise<PaginatedUserResponse> {
		return this.usersService.findAll(query);
	}

	@ApiOperation({
		summary: 'Get user by ID',
		description: 'Retrieve detailed information for a specific user by their ID',
	})
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User retrieved successfully',
		type: UserResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid user ID format',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 400 },
				message: { type: 'string', example: 'Validation failed (uuid is expected)' },
				error: { type: 'string', example: 'Bad Request' },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 404 },
				message: { type: 'string', example: 'User with ID 123e4567-e89b-12d3-a456-426614174000 not found' },
				error: { type: 'string', example: 'Not Found' },
			},
		},
	})
	@Get(':id')
	async findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
		return this.usersService.findById(id);
	}

	@ApiOperation({
		summary: 'Create a new user',
		description: 'Create a new user with email, username, and role assignment',
	})
	@ApiBody({
		type: CreateUserDto,
		description: 'User creation data',
		examples: {
			'standard-user': {
				summary: 'Standard User',
				description: 'Example of creating a standard user',
				value: {
					email: 'john.doe@example.com',
					username: 'john_doe',
					role_id: '123e4567-e89b-12d3-a456-426614174000',
				},
			},
			'admin-user': {
				summary: 'Admin User',
				description: 'Example of creating an admin user',
				value: {
					email: 'admin@example.com',
					username: 'admin_user',
					role_id: '123e4567-e89b-12d3-a456-426614174001',
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: 'User created successfully',
		type: UserResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid input data or validation failed',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 400 },
				message: {
					oneOf: [
						{ type: 'string', example: 'Invalid role ID provided' },
						{ type: 'array', items: { type: 'string' }, example: ['Please provide a valid email address'] },
					],
				},
				error: { type: 'string', example: 'Bad Request' },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: 'User with email or username already exists',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 409 },
				message: { type: 'string', example: 'User with this email already exists' },
				error: { type: 'string', example: 'Conflict' },
			},
		},
	})
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async create(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<UserResponseDto> {
		return this.usersService.createUser(createUserDto);
	}

	@ApiOperation({
		summary: 'Update user profile',
		description: 'Update user profile information including username and role',
	})
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@ApiBody({
		type: UpdateUserDto,
		description: 'User update data',
		examples: {
			'update-username': {
				summary: 'Update Username',
				description: 'Example of updating only the username',
				value: {
					username: 'new_username',
				},
			},
			'update-role': {
				summary: 'Update Role',
				description: 'Example of updating only the role',
				value: {
					role_id: '123e4567-e89b-12d3-a456-426614174001',
				},
			},
			'update-both': {
				summary: 'Update Both',
				description: 'Example of updating both username and role',
				value: {
					username: 'updated_username',
					role_id: '123e4567-e89b-12d3-a456-426614174001',
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'User updated successfully',
		type: UserResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid input data or validation failed',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 400 },
				message: {
					oneOf: [
						{ type: 'string', example: 'Invalid role ID provided' },
						{ type: 'array', items: { type: 'string' }, example: ['Username must be between 3 and 50 characters'] },
					],
				},
				error: { type: 'string', example: 'Bad Request' },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 404 },
				message: { type: 'string', example: 'User with ID 123e4567-e89b-12d3-a456-426614174000 not found' },
				error: { type: 'string', example: 'Not Found' },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.CONFLICT,
		description: 'Username already taken',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 409 },
				message: { type: 'string', example: 'Username is already taken' },
				error: { type: 'string', example: 'Conflict' },
			},
		},
	})
	@Put(':id')
	async update(@Param('id', ParseUUIDPipe) id: string, @Body(ValidationPipe) updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
		return this.usersService.updateUser(id, updateUserDto);
	}

	@ApiOperation({
		summary: 'Delete user',
		description: 'Delete a user and all associated profile data',
	})
	@ApiParam({
		name: 'id',
		type: 'string',
		format: 'uuid',
		description: 'User ID',
		example: '123e4567-e89b-12d3-a456-426614174000',
	})
	@ApiResponse({
		status: HttpStatus.NO_CONTENT,
		description: 'User deleted successfully',
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: 'Invalid user ID format',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 400 },
				message: { type: 'string', example: 'Validation failed (uuid is expected)' },
				error: { type: 'string', example: 'Bad Request' },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: 'User not found',
		schema: {
			type: 'object',
			properties: {
				statusCode: { type: 'number', example: 404 },
				message: { type: 'string', example: 'User with ID 123e4567-e89b-12d3-a456-426614174000 not found' },
				error: { type: 'string', example: 'Not Found' },
			},
		},
	})
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
		return this.usersService.deleteUser(id);
	}

	// TEMPORARY: Test endpoint for development - FIXME: Remove when auth is working
	@ApiOperation({
		summary: '[DEV ONLY] Get all available roles',
		description: 'Development endpoint to check available roles for user creation',
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: 'Roles retrieved successfully',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string', format: 'uuid' },
					name: { type: 'string', enum: ['user', 'staff', 'admin', 'superadmin'] },
				},
			},
		},
	})
	@Get('dev/roles')
	async getRoles() {
		return this.usersService.getAllRoles();
	}
}

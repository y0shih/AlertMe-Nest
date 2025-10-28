# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

AlertMe is a NestJS-based REST API for a reporting and task management system. The application uses:
- **Backend Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL via Supabase
- **ORM**: TypeORM with migrations support
- **Authentication**: Supabase Auth with JWT bearer tokens
- **API Documentation**: Swagger/OpenAPI (accessible at `/api`)

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start in development mode with hot-reload
npm run start:dev

# Start in debug mode
npm run start:debug

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Testing
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug
```

### Code Quality
```bash
# Run ESLint with auto-fix
npm run lint

# Format code with Prettier
npm run format
```

### Database Operations
```bash
# Generate a new migration based on entity changes
npm run migration:generate

# Create a blank migration file
npm run migration:create

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Seed the database with initial data
npm run seed
```

## Architecture

### Module Structure
The application follows NestJS modular architecture organized by domain:

- **`src/modules/auth/`** - Authentication & authorization (Supabase integration, JWT guards, role-based access)
- **`src/modules/users/`** - User management (user profiles, regular users)
- **`src/modules/staff/`** - Staff member management
- **`src/modules/reports/`** - Report and SOS report handling
- **`src/modules/notifications/`** - Notification system

### Key Components

#### Entities (`src/entities/`)
The data model uses TypeORM entities with a role-based user hierarchy:

- **Core Auth**: `AuthUser` → linked to Supabase Auth via `supabase_id`
- **Roles**: `Role` entity defines user types (user, staff, admin, superadmin)
- **User Profiles**: Separate profile entities for different roles
  - `UserProfile` - Regular users who submit reports
  - `StaffProfile` - Staff members who handle tasks
  - `AdminProfile` - Admins who assign tasks
- **Reporting System**:
  - `Report` - User-submitted reports with location (lat/lng) and status
  - `SosReport` - Emergency reports
  - `Task` - Work items assigned by admins to staff
  - `ReportResponse` - Responses/updates to reports and tasks

#### Authentication Flow
- Uses Supabase for authentication backend
- `SupabaseAuthGuard` validates JWT tokens from Authorization header
- `RolesGuard` enforces role-based access control
- Public routes can be marked with `@Public()` decorator
- User info is attached to `request.user` after authentication

#### Status Enums (`src/enums/user-role.enum.ts`)
- **UserRole**: user, staff, admin, superadmin
- **ReportStatus**: pending, in_progress, reviewed, resolved, closed
- **TaskStatus**: not_received, received, in_progress, completed, cancelled

### Configuration
- Environment variables are managed via `@nestjs/config`
- Database config is in `src/config/database.config.ts`
- Requires Supabase credentials (see `.env.example`)
- Database uses SSL connection to Supabase
- `synchronize` is disabled - use migrations for schema changes

### API Documentation
- Swagger UI is available at `http://localhost:3000/api`
- JWT authentication is configured via Bearer token
- All endpoints are automatically documented via decorators

## Development Workflow

### Adding New Features
1. Create entities in `src/entities/` if new data models are needed
2. Generate migration: `npm run migration:generate`
3. Create/update DTOs in `src/dto/`
4. Implement service logic in module's service file
5. Add controller endpoints with Swagger decorators
6. Apply guards for authentication/authorization
7. Run linter before committing: `npm run lint`

### Database Schema Changes
1. Modify TypeORM entities
2. Generate migration: `npm run migration:generate`
3. Review generated migration SQL
4. Run migration: `npm run migration:run`
5. Update seeders if needed: `npm run seed`

### Authentication in Controllers
```typescript
// Protected route (default)
@Get('protected')
async getProtected(@Req() req) {
  const user = req.user; // Available after SupabaseAuthGuard
}

// Public route
@Public()
@Get('public')
async getPublic() {
  // No authentication required
}

// Role-restricted route
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@Get('admin-only')
async adminOnly() {
  // Only admins can access
}
```

## Important Notes

- **Database synchronize is disabled** - always use migrations for schema changes
- **Supabase handles password management** - AuthUser entity does not store passwords
- **Location data** is stored as lat/lng floats on Report entities
- **Validation is global** - DTOs are automatically validated via class-validator
- **CORS is enabled** for all origins in development
- Test files use `.spec.ts` suffix and are located alongside source files

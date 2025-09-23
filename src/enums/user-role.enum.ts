export enum UserRole {
	USER = 'user',
	STAFF = 'staff',
	ADMIN = 'admin',
	SUPERADMIN = 'superadmin',
}

export enum ReportStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	REVIEWED = 'reviewed',
	RESOLVED = 'resolved',
	CLOSED = 'closed',
}

export enum TaskStatus {
	NOT_RECEIVED = 'not_received',
	RECEIVED = 'received',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	CANCELLED = 'cancelled',
}

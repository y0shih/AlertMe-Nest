import { ReportStatus } from '../enums/user-role.enum';

export class CreateReportDto {
	name: string;
	details: string;
	attachment_path?: string;
	lat: number;
	lng: number;
	user_id: string;
}

export class UpdateReportDto {
	name?: string;
	details?: string;
	status?: ReportStatus;
	attachment_path?: string;
}

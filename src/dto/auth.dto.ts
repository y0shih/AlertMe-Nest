export class SignUpDto {
	email: string;
	password: string;
	username: string;
}

export class SignInDto {
	email: string;
	password: string;
}

export class RefreshTokenDto {
	refresh_token: string;
}
